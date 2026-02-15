const express = require('express');

const { body, query } = require('express-validator');
const User = require('../models/User');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validateObjectId');
const { handleValidationErrors } = require('../middleware/validation');
const { followLimiter } = require('../middleware/rateLimiters');
const { getRankInfo } = require('../utils/reputation');
const logger = require('../utils/logger');
const { STATUS_PRESET_VALUES, STATUS_EMOJI_VALUES } = require('../constants/visualStatus');

const router = express.Router();

const toPublicUserLite = (doc) => ({
  _id: doc._id,
  username: doc.username,
  createdAt: doc.createdAt
});

// @route   GET /api/users/me/visual-status
// @desc    Obtener estado visual actual del usuario autenticado
// @access  Private
router.get('/me/visual-status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('statusPreset statusEmoji');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    return res.json({
      success: true,
      statusPreset: user.statusPreset || 'en_silencio',
      statusEmoji: user.statusEmoji || '✨'
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estado visual'
    });
  }
});

// @route   PATCH /api/users/me/visual-status
// @desc    Actualizar estado visual del usuario autenticado
// @access  Private
router.patch('/me/visual-status', protect, [
  body('statusPreset')
    .exists()
    .withMessage('statusPreset es requerido')
    .isIn(STATUS_PRESET_VALUES)
    .withMessage('statusPreset invalido'),
  body('statusEmoji')
    .exists()
    .withMessage('statusEmoji es requerido')
    .isIn(STATUS_EMOJI_VALUES)
    .withMessage('statusEmoji invalido'),
  handleValidationErrors
], async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    user.statusPreset = req.body.statusPreset;
    user.statusEmoji = req.body.statusEmoji;
    await user.save();

    return res.json({
      success: true,
      statusPreset: user.statusPreset,
      statusEmoji: user.statusEmoji
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar estado visual'
    });
  }
});

// @route   POST /api/users/:id/follow
// @desc    Seguir usuario
// @access  Private
router.post('/:id/follow', protect, followLimiter, [validateObjectId('id'), handleValidationErrors], async (req, res) => {
  try {
    const currentUserId = req.user._id.toString();
    const targetUserId = req.params.id;

    if (currentUserId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'No puedes seguirte a ti mismo'
      });
    }

    const targetUser = await User.findById(targetUserId).select('_id');
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await Promise.all([
      User.updateOne({ _id: currentUserId }, { $addToSet: { following: targetUserId } }),
      User.updateOne({ _id: targetUserId }, { $addToSet: { followers: currentUserId } })
    ]);

    const [currentUser, target] = await Promise.all([
      User.findById(currentUserId).select('following'),
      User.findById(targetUserId).select('followers')
    ]);

    logger.info('User follow action', {
      route: '/api/users/:id/follow',
      userId: currentUserId,
      targetUserId
    });

    return res.json({
      success: true,
      following: true,
      followersCount: target?.followers?.length || 0,
      followingCount: currentUser?.following?.length || 0
    });
  } catch (error) {
    logger.error('Follow action failed', {
      route: '/api/users/:id/follow',
      userId: req.user?._id?.toString?.() || null,
      targetUserId: req.params.id,
      error: error.message
    });

    return res.status(500).json({
      success: false,
      message: 'Error al seguir usuario'
    });
  }
});

// @route   POST /api/users/:id/unfollow
// @desc    Dejar de seguir usuario
// @access  Private
router.post('/:id/unfollow', protect, followLimiter, [validateObjectId('id'), handleValidationErrors], async (req, res) => {
  try {
    const currentUserId = req.user._id.toString();
    const targetUserId = req.params.id;

    if (currentUserId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'No puedes dejar de seguirte a ti mismo'
      });
    }

    const targetUser = await User.findById(targetUserId).select('_id');
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await Promise.all([
      User.updateOne({ _id: currentUserId }, { $pull: { following: targetUserId } }),
      User.updateOne({ _id: targetUserId }, { $pull: { followers: currentUserId } })
    ]);

    const [currentUser, target] = await Promise.all([
      User.findById(currentUserId).select('following'),
      User.findById(targetUserId).select('followers')
    ]);

    logger.info('User unfollow action', {
      route: '/api/users/:id/unfollow',
      userId: currentUserId,
      targetUserId
    });

    return res.json({
      success: true,
      following: false,
      followersCount: target?.followers?.length || 0,
      followingCount: currentUser?.following?.length || 0
    });
  } catch (error) {
    logger.error('Unfollow action failed', {
      route: '/api/users/:id/unfollow',
      userId: req.user?._id?.toString?.() || null,
      targetUserId: req.params.id,
      error: error.message
    });

    return res.status(500).json({
      success: false,
      message: 'Error al dejar de seguir usuario'
    });
  }
});

// @route   GET /api/users/:id/followers
// @desc    Obtener seguidores de usuario
// @access  Private
router.get('/:id/followers', protect, [validateObjectId('id'), handleValidationErrors], async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id).select('followers');
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const users = await User.find({ _id: { $in: targetUser.followers || [] } })
      .select('_id username createdAt')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      users: users.map(toPublicUserLite),
      count: users.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener seguidores'
    });
  }
});

// @route   GET /api/users/:id/following
// @desc    Obtener seguidos de usuario
// @access  Private
router.get('/:id/following', protect, [validateObjectId('id'), handleValidationErrors], async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id).select('following');
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const users = await User.find({ _id: { $in: targetUser.following || [] } })
      .select('_id username createdAt')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      users: users.map(toPublicUserLite),
      count: users.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener seguidos'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Obtener perfil de usuario
// @access  Public
router.get('/:id', [validateObjectId('id'), handleValidationErrors], async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Obtener estadísticas del usuario
    const postCount = await Post.countDocuments({ 
      author: user._id, 
      isDeleted: false 
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        reputation: user.reputation,
        level: user.calculateLevel(),
        rank: getRankInfo(user.reputation),
        isVerified: user.isVerified,
        statusPreset: user.statusPreset,
        statusEmoji: user.statusEmoji,
        verificationType: user.verificationType,
        createdAt: user.createdAt,
        postCount,
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Actualizar perfil de usuario
// @access  Private (solo el propio usuario o admin)
router.put('/:id', protect, [validateObjectId('id'), handleValidationErrors], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Solo el propio usuario o un admin puede actualizar
    if (req.user._id.toString() !== user._id.toString() && req.user.role !== 'administrador') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar este perfil'
      });
    }

    // Actualizar campos permitidos
    const { username } = req.body;
    if (username) {
      const usernameExists = await User.findOne({ 
        username, 
        _id: { $ne: user._id } 
      });
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de usuario ya está en uso'
        });
      }
      user.username = username;
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        reputation: user.reputation,
        level: user.calculateLevel(),
        rank: getRankInfo(user.reputation),
        statusPreset: user.statusPreset,
        statusEmoji: user.statusEmoji,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario'
    });
  }
});

// @route   GET /api/users/:id/posts
// @desc    Obtener publicaciones de un usuario (con paginación)
// @access  Public
router.get('/:id/posts', [
  validateObjectId('id'),
  query('page').optional().isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Límite debe estar entre 1 y 50'),
  handleValidationErrors
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { 
      author: req.params.id, 
      isDeleted: false 
    };

    const posts = await Post.find(filter)
      .populate('author', 'username reputation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(filter);

    res.json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener publicaciones'
    });
  }
});

module.exports = router;


