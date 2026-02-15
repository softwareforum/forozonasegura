const sendEmail = require('../utils/email');
const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { getRankInfo } = require('../utils/reputation');

const verifyRecaptcha = require('../middleware/recaptcha');
const { authLimiter, passwordLimiter, meLimiter } = require('../middleware/rateLimiters');
const { blockIfIpBlocked, blockIfLowScore, bruteForceGuard, onAuthFail, onAuthSuccess } = require('../middleware/abuseGuard');

const router = express.Router();
const clientBaseUrl = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRE || '7d'
});

const createAndSendVerificationToken = async (user) => {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${clientBaseUrl}/verify-email?token=${verificationToken}`;
  try {
    await sendEmail({
      to: user.email,
      subject: 'Verifica tu cuenta en Foro Zona Segura',
      text: `Hola ${user.username},\n\nPara activar tu cuenta visita: ${verifyUrl}`,
      html: `<p>Hola <strong>${user.username}</strong>,</p><p><a href="${verifyUrl}" target="_blank">Verificar mi cuenta</a></p>`
    });
  } catch (err) {
    logger.error('Verification email send failed', { error: err.message });
  }
};

router.post(
  '/register',
  authLimiter,
  blockIfIpBlocked,
  verifyRecaptcha('register'),
  [
    body('username').trim().isLength({ min: 3, max: 30 }).withMessage('El nombre de usuario debe tener entre 3 y 30 caracteres'),
    body('email').isEmail().normalizeEmail().withMessage('Por favor, introduce un email valido'),
    body('password').isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { username, email, password } = req.body;
      const userExists = await User.findOne({ $or: [{ email }, { username }] });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'El usuario o email ya esta registrado' });
      }

      const user = await User.create({ username, email, password, isVerified: false });
      await createAndSendVerificationToken(user);

      return res.status(201).json({
        success: true,
        message: 'Revisa tu email para verificar la cuenta'
      });
    } catch (error) {
      logger.error('Register error', { error: error.message });
      return res.status(500).json({ success: false, message: 'Error al registrar usuario' });
    }
  }
);

router.post(
  '/login',
  authLimiter,
  blockIfIpBlocked,
  verifyRecaptcha('login'),
  blockIfLowScore('login'),
  bruteForceGuard('login'),
  [
    body('email').isEmail().withMessage('Por favor, introduce un email valido'),
    body('password').notEmpty().withMessage('La contrasena es obligatoria')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.comparePassword(password))) {
        await onAuthFail(req, 'login_invalid_credentials', { reason: 'invalid_credentials' });
        res.locals.securityCode = 'UNAUTHORIZED';
        return res.status(401).json({ success: false, message: 'Credenciales invalidas' });
      }

      if (user.isBanned) {
        res.locals.securityCode = 'FORBIDDEN';
        return res.status(403).json({ success: false, message: `Tu cuenta ha sido suspendida: ${user.banReason}` });
      }

      if (!user.isVerified) {
        res.locals.securityCode = 'FORBIDDEN';
        return res.status(403).json({
          success: false,
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Debes verificar tu email antes de acceder'
        });
      }

      await onAuthSuccess(req, 'login_success', { userId: user._id });
      const token = generateToken(user._id);
      return res.json({
        success: true,
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          reputation: user.reputation,
          level: user.level,
          rank: getRankInfo(user.reputation),
          isVerified: user.isVerified,
          statusPreset: user.statusPreset,
          statusEmoji: user.statusEmoji,
          verificationType: user.verificationType,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      logger.error('Login error', { error: error.message });
      return res.status(500).json({ success: false, message: 'Error al iniciar sesion' });
    }
  }
);

router.post(
  '/resend-verification',
  meLimiter,
  [
    body('email')
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage('Email invalido')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const rawEmail = req.body?.email ? String(req.body.email).trim().toLowerCase() : '';
      if (!rawEmail) {
        return res.json({
          success: true,
          message: 'Si la cuenta existe y no esta verificada, enviaremos un nuevo email.'
        });
      }

      const user = await User.findOne({ email: rawEmail });
      if (user && !user.isVerified) {
        await createAndSendVerificationToken(user);
      }

      return res.json({
        success: true,
        message: 'Si la cuenta existe y no esta verificada, enviaremos un nuevo email.'
      });
    } catch (error) {
      logger.error('Resend verification error', { error: error.message });
      return res.json({
        success: true,
        message: 'Si la cuenta existe y no esta verificada, enviaremos un nuevo email.'
      });
    }
  }
);

router.get('/me', meLimiter, protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        reputation: user.reputation,
        level: user.calculateLevel(),
        rank: getRankInfo(user.reputation),
        isVerified: user.isVerified,
        statusPreset: user.statusPreset,
        statusEmoji: user.statusEmoji,
        verificationType: user.verificationType,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Auth /me error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Error al obtener usuario' });
  }
});

router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token invalido o expirado' });
    }

    const user = await User.findOne({ emailVerificationToken: token });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Token invalido o expirado' });
    }

    if (user.isVerified) {
      return res.json({
        success: true,
        message: 'Email ya verificado'
      });
    }

    if (!user.emailVerificationExpire || user.emailVerificationExpire.getTime() <= Date.now()) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ success: false, message: 'Token invalido o expirado' });
    }

    user.isVerified = true;
    user.verificationType = 'legal';
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return res.json({
      success: true,
      message: 'Email verificado correctamente',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified,
        verificationType: user.verificationType
      }
    });
  } catch (error) {
    logger.error('Verify email error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Error en el proceso de verificacion.' });
  }
});

router.post(
  '/forgot-password',
  passwordLimiter,
  blockIfIpBlocked,
  verifyRecaptcha('forgot_password'),
  [body('email').isEmail().withMessage('Por favor, introduce un email valido')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.json({ success: true, message: 'Si el email esta registrado, te hemos enviado instrucciones para restablecer la contrasena.' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
      await user.save({ validateBeforeSave: false });

      const resetUrl = `${clientBaseUrl}/reset-password?token=${resetToken}`;
      try {
        await sendEmail({
          to: user.email,
          subject: 'Restablecer contrasena - Foro Zona Segura',
          text: `Hola ${user.username},\n\nRestablece tu contrasena aqui: ${resetUrl}`,
          html: `<p>Hola <strong>${user.username}</strong>,</p><p><a href="${resetUrl}" target="_blank">Restablecer contrasena</a></p>`
        });
      } catch (err) {
        logger.error('Forgot-password email send failed', { error: err.message });
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
        return res.status(500).json({ success: false, message: 'Error al enviar el email de recuperacion.' });
      }

      return res.json({ success: true, message: 'Si el email esta registrado, te hemos enviado instrucciones para restablecer la contrasena.' });
    } catch (error) {
      logger.error('Forgot-password error', { error: error.message });
      return res.status(500).json({ success: false, message: 'Error en el proceso de recuperacion.' });
    }
  }
);

router.post(
  '/reset-password',
  passwordLimiter,
  blockIfIpBlocked,
  verifyRecaptcha('reset_password'),
  [
    body('token').notEmpty().withMessage('El token es requerido'),
    body('password').isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { token, password } = req.body;
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpire: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ success: false, message: 'Token invalido o expirado.' });
      }

      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.json({ success: true, message: 'Contrasena actualizada correctamente. Ya puedes iniciar sesion.' });
    } catch (error) {
      logger.error('Reset-password error', { error: error.message });
      return res.status(500).json({ success: false, message: 'Error al restablecer la contrasena.' });
    }
  }
);

module.exports = router;
