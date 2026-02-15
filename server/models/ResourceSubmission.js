const mongoose = require('mongoose');

const resourceSubmissionSchema = new mongoose.Schema({
  entityName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['ong', 'clinica', 'asesoria_legal', 'psicologia', 'trabajo_social', 'otro'],
    index: true
  },
  cityProvince: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  coverage: {
    type: String,
    required: true,
    enum: ['local', 'provincial', 'nacional', 'online']
  },
  website: {
    type: String,
    trim: true,
    maxlength: 300
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 40
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 20,
    maxlength: 800
  },
  consent: {
    type: Boolean,
    required: true,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewNote: {
    type: String,
    trim: true,
    maxlength: 300
  },
  meta: {
    ip: { type: String, trim: true, maxlength: 100 },
    userAgent: { type: String, trim: true, maxlength: 400 }
  }
}, { timestamps: true });

resourceSubmissionSchema.index({ status: 1, createdAt: -1 });
resourceSubmissionSchema.index({ resourceType: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('ResourceSubmission', resourceSubmissionSchema);
