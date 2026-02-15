const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['post', 'reply'],
    required: true,
    index: true
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },
  reply: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  communitySlug: {
    type: String,
    trim: true
  },
  provinceSlug: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

activitySchema.index({ createdAt: -1 });
activitySchema.index({ actor: 1, createdAt: -1 });
activitySchema.index({ provinceSlug: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
