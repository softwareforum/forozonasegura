const express = require('express');
const { query, validationResult } = require('express-validator');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { meLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

const toSlug = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const validators = [
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
];

const mapActivityItem = (item) => {
  const province = item.post?.location?.provincia || '';
  const community = item.post?.community || '';
  const computedProvinceSlug = item.provinceSlug || toSlug(province || community);
  const computedCommunitySlug = item.communitySlug || toSlug(community || province);

  return {
    _id: item._id,
    type: item.type,
    createdAt: item.createdAt,
    actor: item.actor ? {
      _id: item.actor._id,
      username: item.actor.username,
      createdAt: item.actor.createdAt
    } : null,
    post: item.post ? {
      _id: item.post._id,
      title: item.post.title,
      province: province || community || '',
      provinceSlug: computedProvinceSlug,
      communitySlug: computedCommunitySlug,
      category: item.post.category || item.category || ''
    } : null,
    link: item.post ? `/post/${item.post._id}` : '/'
  };
};

router.get('/following', protect, meLimiter, validators, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const limit = Number.parseInt(req.query.limit, 10) || 20;
    const followingIds = Array.isArray(req.user?.following)
      ? req.user.following
      : [];
    let resolvedFollowing = followingIds;

    if (resolvedFollowing.length === 0) {
      const userDoc = await User.findById(req.user._id).select('following');
      resolvedFollowing = userDoc?.following || [];
    }

    if (!resolvedFollowing.length) {
      return res.json({
        success: true,
        activities: []
      });
    }

    const items = await Activity.find({
      actor: { $in: resolvedFollowing }
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', '_id username createdAt')
      .populate('post', '_id title category community location createdAt');

    return res.json({
      success: true,
      activities: items.map(mapActivityItem)
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener actividad de seguidos'
    });
  }
});

router.get('/', validators, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const limit = Number.parseInt(req.query.limit, 10) || 20;

    const items = await Activity.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', '_id username createdAt')
      .populate('post', '_id title category community location createdAt');

    const activities = items.map(mapActivityItem);

    return res.json({
      success: true,
      activities
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener actividad reciente'
    });
  }
});

module.exports = router;
