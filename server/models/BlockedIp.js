const mongoose = require('mongoose');

const BlockedIpSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    reason: { type: String, default: 'blocked' },
    until: { type: Date, required: true },
  },
  { timestamps: true }
);

// Índices (sin duplicar con index: true del schema)
// TTL: cuando "until" queda en el pasado, Mongo lo elimina solo
BlockedIpSchema.index({ until: 1 }, { expireAfterSeconds: 0 });

// Evita duplicados por ip
BlockedIpSchema.index({ ip: 1 }, { unique: true });

module.exports = mongoose.model('BlockedIp', BlockedIpSchema);
