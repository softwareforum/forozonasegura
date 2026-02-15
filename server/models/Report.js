const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  originalName: { type: String, required: true, trim: true },
  mimeType: { type: String, required: true, trim: true },
  size: { type: Number, required: true, min: 0 },
  storage: {
    type: String,
    enum: ['local', 's3'],
    default: 'local'
  },
  pathOrUrl: { type: String, required: true, trim: true },
  publicUrl: { type: String, trim: true }
}, { _id: false });

const reportSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: ['inquilino', 'facilita_espacio'],
    required: true,
    default: 'inquilino',
    index: true
  },
  reporter: {
    name: { type: String, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 40 }
  },
  message: {
    type: String,
    required: true,
    trim: true,
    minlength: 20,
    maxlength: 5000
  },
  attachments: {
    type: [attachmentSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['open', 'approved', 'archived'],
    default: 'open',
    index: true
  },
  meta: {
    ip: { type: String, trim: true, maxlength: 100 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userAgent: { type: String, trim: true, maxlength: 400 }
  },
  // Compatibilidad con reportes previos
  metadata: {
    ip: { type: String, trim: true, maxlength: 100 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userAgent: { type: String, trim: true, maxlength: 400 }
  }
}, { timestamps: true });

reportSchema.index({ postId: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
