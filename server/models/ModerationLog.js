const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema({
  moderator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['delete_post', 'delete_reply', 'ban_user', 'unban_user', 'lock_post', 'unlock_post', 'pin_post', 'unpin_post', 'warn_user'],
    required: true
  },
  targetType: {
    type: String,
    enum: ['post', 'reply', 'user'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ModerationLog', moderationLogSchema);

