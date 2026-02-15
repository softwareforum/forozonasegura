const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { STATUS_PRESET_VALUES, STATUS_EMOJI_VALUES } = require('../constants/visualStatus');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'El nombre de usuario es requerido'],
    unique: true,
    trim: true,
    minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres'],
    maxlength: [30, 'El nombre de usuario no puede exceder 30 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un email válido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false
  },
  role: {
    type: String,
    enum: ['usuario', 'moderador', 'administrador'],
    default: 'usuario'
  },
  reputation: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationType: {
    type: String,
    enum: ['none', 'legal', 'inmobiliaria', 'contabilidad'],
    default: 'none'
  },
  statusPreset: {
    type: String,
    enum: STATUS_PRESET_VALUES,
    default: 'en_silencio'
  },
  statusEmoji: {
    type: String,
    enum: STATUS_EMOJI_VALUES,
    default: '✨'
  },

  emailVerificationToken: {
    type: String
  },
  emailVerificationExpire: {
    type: Date
  },

  // 🔽 NUEVO: campos para recuperar contraseña
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpire: {
    type: Date
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    default: ''
  },
  dailyCounters: {
    dayKey: { type: String, default: '' },
    postsCounted: { type: Number, default: 0 },
    repliesCounted: { type: Number, default: 0 },
    activityPoints: { type: Number, default: 0 }
  },
  weeklyCounters: {
    weekKey: { type: String, default: '' },
    approvedReportsCounted: { type: Number, default: 0 }
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }]
});

userSchema.path('followers').default(() => []);
userSchema.path('following').default(() => []);

// Hash de contraseña antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Calcular nivel basado en reputación
userSchema.methods.calculateLevel = function() {
  if (this.reputation < 0) return 1;
  if (this.reputation < 50) return 1;
  if (this.reputation < 150) return 2;
  if (this.reputation < 300) return 3;
  if (this.reputation < 500) return 4;
  return 5;
};

module.exports = mongoose.model('User', userSchema);
