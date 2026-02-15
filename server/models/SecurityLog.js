const mongoose = require('mongoose');

const SecurityLogSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    route: { type: String },
    action: { type: String }, // login/register/forgot_password/reset_password
    score: { type: Number },  // reCAPTCHA v3 score
    email: { type: String },  // si aplica
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ok: { type: Boolean, default: false }, // si el intento fue exitoso
    reason: { type: String }, // ejemplo: "bad_password", "low_score", "blocked_ip"
    meta: {
  type: mongoose.Schema.Types.Mixed,
}
   // extra opcional
  },
  { timestamps: true }
);

// Índices útiles
SecurityLogSchema.index({ ip: 1, createdAt: -1 });
SecurityLogSchema.index({ action: 1, createdAt: -1 });
SecurityLogSchema.index({ ok: 1, createdAt: -1 });

module.exports = mongoose.model('SecurityLog', SecurityLogSchema);
