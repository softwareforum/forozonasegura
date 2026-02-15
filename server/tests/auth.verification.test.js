const request = require('supertest');
const express = require('express');

jest.mock('../utils/email', () => jest.fn().mockResolvedValue({ messageId: 'x' }));
jest.mock('../middleware/recaptcha', () => () => (_req, _res, next) => next());
jest.mock('../middleware/abuseGuard', () => ({
  blockIfIpBlocked: (_req, _res, next) => next(),
  blockIfLowScore: () => (_req, _res, next) => next(),
  bruteForceGuard: () => (_req, _res, next) => next(),
  onAuthFail: jest.fn().mockResolvedValue(),
  onAuthSuccess: jest.fn().mockResolvedValue()
}));

jest.mock('../models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn(() => ({ id: '507f1f77bcf86cd799439011' }))
}));

const User = require('../models/User');
const authRouter = require('../routes/auth');
const { protect } = require('../middleware/auth');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.get('/api/private', protect, (_req, res) => {
    res.json({ success: true });
  });
  return app;
};

describe('Email verification access control', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  test('register creates unverified user and does not return token', async () => {
    User.findOne.mockResolvedValue(null);
    const createdUser = {
      _id: '507f1f77bcf86cd799439011',
      username: 'newuser',
      email: 'newuser@example.com',
      isVerified: false,
      save: jest.fn().mockResolvedValue()
    };
    User.create.mockResolvedValue(createdUser);

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
        email: 'newuser@example.com',
        password: '123456',
        recaptchaToken: 'ok'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeUndefined();
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      username: 'newuser',
      email: 'newuser@example.com',
      isVerified: false
    }));
  });

  test('login with unverified account returns EMAIL_NOT_VERIFIED', async () => {
    const unverifiedUser = {
      _id: '507f1f77bcf86cd799439011',
      email: 'newuser@example.com',
      username: 'newuser',
      isVerified: false,
      isBanned: false,
      comparePassword: jest.fn().mockResolvedValue(true)
    };

    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(unverifiedUser)
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'newuser@example.com',
        password: '123456',
        recaptchaToken: 'ok'
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  test('protect blocks unverified users even with valid token', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        isVerified: false,
        isBanned: false
      })
    });

    const res = await request(app)
      .get('/api/private')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  test('verify-email with valid token verifies user', async () => {
    const userDoc = {
      _id: '507f1f77bcf86cd799439011',
      username: 'newuser',
      email: 'newuser@example.com',
      isVerified: false,
      verificationType: 'none',
      emailVerificationToken: 'valid-token',
      emailVerificationExpire: new Date(Date.now() + 60 * 60 * 1000),
      save: jest.fn().mockResolvedValue()
    };
    User.findOne.mockResolvedValue(userDoc);

    const res = await request(app).get('/api/auth/verify-email?token=valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Email verificado correctamente');
    expect(userDoc.isVerified).toBe(true);
    expect(userDoc.save).toHaveBeenCalled();
  });

  test('verify-email with invalid token returns 400', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app).get('/api/auth/verify-email?token=invalid-token');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Token invalido o expirado');
  });

  test('verify-email with expired token returns 400', async () => {
    const userDoc = {
      _id: '507f1f77bcf86cd799439011',
      isVerified: false,
      emailVerificationToken: 'expired-token',
      emailVerificationExpire: new Date(Date.now() - 60 * 60 * 1000),
      save: jest.fn().mockResolvedValue()
    };
    User.findOne.mockResolvedValue(userDoc);

    const res = await request(app).get('/api/auth/verify-email?token=expired-token');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Token invalido o expirado');
    expect(userDoc.save).toHaveBeenCalled();
  });

  test('verify-email token cannot be reused', async () => {
    const userDoc = {
      _id: '507f1f77bcf86cd799439011',
      username: 'newuser',
      email: 'newuser@example.com',
      isVerified: false,
      verificationType: 'none',
      emailVerificationToken: 'single-use-token',
      emailVerificationExpire: new Date(Date.now() + 60 * 60 * 1000),
      save: jest.fn().mockResolvedValue()
    };

    User.findOne
      .mockResolvedValueOnce(userDoc)
      .mockResolvedValueOnce(null);

    const first = await request(app).get('/api/auth/verify-email?token=single-use-token');
    const second = await request(app).get('/api/auth/verify-email?token=single-use-token');

    expect(first.status).toBe(200);
    expect(second.status).toBe(400);
    expect(userDoc.save).toHaveBeenCalledTimes(1);
  });
});
