const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const ModerationLog = require('../models/ModerationLog');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validateObjectId');
const { handleValidationErrors } = require('../middleware/validation');
const { recalcPostRatings } = require('../utils/ratings');

const router = express.Router();

// Todas las rutas requieren autenticación y rol de moderador o administrador
router.use(protect);
router.use(authorize('moderador', 'administrador'));

// @route   DELETE /api/moderation/posts/:id
// @desc    Eliminar publicación
// @access  Private (moderadores)
router.delete('/posts/:id', [validateObjectId('id'), handleValidationErrors], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Publicación no encontrada'
      });
    }

    post.isDeleted = true;
    post.deletedBy = req.user._id;
    post.deletedAt = Date.now();
    await post.save();

    // Registrar acción
    await ModerationLog.create({
      moderator: req.user._id,
      action: 'delete_post',
      targetType: 'post',
      targetId: post._id,
      reason: req.body.reason || 'Sin razón especificada'
    });

    res.json({
      success: true,
      message: 'Publicación eliminada'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar publicación'
    });
  }
});

// @route   DELETE /api/moderation/posts/:postId/replies/:replyId
// @desc    Eliminar respuesta
// @access  Private (moderadores)
router.delete('/posts/:postId/replies/:replyId', [validateObjectId('postId'), validateObjectId('replyId'), handleValidationErrors], async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Publicación no encontrada'
      });
    }

    const reply = post.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Respuesta no encontrada'
      });
    }

    reply.isDeleted = true;
    reply.deletedBy = req.user._id;
    reply.deletedAt = Date.now();
    recalcPostRatings(post);
    await post.save();

    await ModerationLog.create({
      moderator: req.user._id,
      action: 'delete_reply',
      targetType: 'reply',
      targetId: reply._id,
      reason: req.body.reason || 'Sin razón especificada'
    });

    res.json({
      success: true,
      message: 'Respuesta eliminada'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar respuesta'
    });
  }
});

// @route   POST /api/moderation/users/:id/ban
// @desc    Banear usuario
// @access  Private (moderadores)
router.post('/users/:id/ban', [validateObjectId('id'), handleValidationErrors], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    user.isBanned = true;
    user.banReason = req.body.reason || 'Sin razón especificada';
    await user.save();

    await ModerationLog.create({
      moderator: req.user._id,
      action: 'ban_user',
      targetType: 'user',
      targetId: user._id,
      reason: user.banReason
    });

    res.json({
      success: true,
      message: 'Usuario baneado'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al banear usuario'
    });
  }
});

// @route   POST /api/moderation/users/:id/unban
// @desc    Desbanear usuario
// @access  Private (moderadores)
router.post('/users/:id/unban', [validateObjectId('id'), handleValidationErrors], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    user.isBanned = false;
    user.banReason = '';
    await user.save();

    await ModerationLog.create({
      moderator: req.user._id,
      action: 'unban_user',
      targetType: 'user',
      targetId: user._id,
      reason: req.body.reason || 'Usuario desbaneado'
    });

    res.json({
      success: true,
      message: 'Usuario desbaneado'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al desbanear usuario'
    });
  }
});

// @route   POST /api/moderation/posts/:id/lock
// @desc    Bloquear/desbloquear publicación
// @access  Private (moderadores)
router.post('/posts/:id/lock', [validateObjectId('id'), handleValidationErrors], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Publicación no encontrada'
      });
    }

    post.isLocked = !post.isLocked;
    await post.save();

    await ModerationLog.create({
      moderator: req.user._id,
      action: post.isLocked ? 'lock_post' : 'unlock_post',
      targetType: 'post',
      targetId: post._id,
      reason: req.body.reason || 'Sin razón especificada'
    });

    res.json({
      success: true,
      message: post.isLocked ? 'Publicación bloqueada' : 'Publicación desbloqueada',
      isLocked: post.isLocked
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al bloquear/desbloquear publicación'
    });
  }
});

// @route   POST /api/moderation/posts/:id/pin
// @desc    Fijar/desfijar publicación
// @access  Private (moderadores)
router.post('/posts/:id/pin', [validateObjectId('id'), handleValidationErrors], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Publicación no encontrada'
      });
    }

    post.isPinned = !post.isPinned;
    await post.save();

    await ModerationLog.create({
      moderator: req.user._id,
      action: post.isPinned ? 'pin_post' : 'unpin_post',
      targetType: 'post',
      targetId: post._id,
      reason: req.body.reason || 'Sin razón especificada'
    });

    res.json({
      success: true,
      message: post.isPinned ? 'Publicación fijada' : 'Publicación desfijada',
      isPinned: post.isPinned
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al fijar/desfijar publicación'
    });
  }
});

// @route   GET /api/moderation/logs
// @desc    Obtener logs de moderación
// @access  Private (moderadores)
router.get('/logs', async (req, res) => {
  try {
    const logs = await ModerationLog.find()
      .populate('moderator', 'username')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener logs'
    });
  }
});

module.exports = router;


