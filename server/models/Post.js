const mongoose = require('mongoose');
const { ALLOWED_SERVICES } = require('../constants/services');

const LEGACY_SYNC_KEYS = {
  ['ba\u00f1oDigno']: 'banoDigno',
  ['conviveConDue\u00f1o']: 'conviveConDueno',
  ['bañoDigno']: 'banoDigno',
  ['conviveConDueño']: 'conviveConDueno'
};

const replyServiciosSchemaDefinition = ALLOWED_SERVICES.reduce((acc, key) => {
  acc[key] = { type: Boolean, default: false };
  return acc;
}, {});

const replySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Contrato canonico de servicios
  servicios: {
    type: new mongoose.Schema(replyServiciosSchemaDefinition, { _id: false }),
    default: () => ({})
  },
  // Legacy temporal
  amenities: [{
    type: String
  }],
  anfitrion: {
    tieneVicios: {
      type: String,
      enum: ['no', 'a_veces', 'frecuentes'],
      default: 'no'
    },
    acoso: {
      type: String,
      enum: ['nunca', 'a_veces', 'frecuente'],
      default: 'nunca'
    },
    caracter: {
      type: String,
      enum: ['respetuoso', 'neutro', 'conflictivo'],
      default: 'neutro'
    }
  },
  experiencia: {
    confort: {
      type: Number,
      min: 1,
      max: 5
    },
    seguridadPercibida: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  checkInOut: {
    type: String,
    enum: [
      'Llegada despues de las 15:00 y salida antes de las 12:00',
      'Llegada despuÃ©s de las 15:00 y salida antes de las 12:00',
      'Llegada y salida flexible'
    ],
    required: [true, 'El horario de entrada y salida es requerido']
  },
  depositRequired: {
    type: Boolean,
    required: [true, 'El campo de deposito es requerido']
  },
  cleaningFrequency: {
    type: String,
    enum: [
      'Nunca',
      '1 vez al mes',
      '1 vez por semana',
      '2 o mas veces por semana',
      '2 o mÃ¡s veces por semana',
      'Limpieza diaria'
    ],
    required: [true, 'La frecuencia de limpieza es requerida']
  },
  // Mantener content para compatibilidad con respuestas antiguas (opcional)
  content: {
    type: String,
    required: false,
    maxlength: [5000, 'El contenido no puede exceder 5000 caracteres']
  },
  votes: {
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  reports: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    anonymous: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El titulo es requerido'],
    trim: true,
    maxlength: [200, 'El titulo no puede exceder 200 caracteres']
  },
  content: {
    type: String,
    required: false,
    maxlength: [10000, 'El contenido no puede exceder 10000 caracteres']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['piso', 'plaza', 'club'],
    required: false
  },
  community: {
    type: String,
    required: false
  },
  city: {
    type: String,
    required: false
  },
  zonaSegura: {
    type: Boolean,
    default: true
  },
  postType: {
    type: String,
    enum: ['alquiler', 'traspaso', 'oferta', 'busqueda'],
    required: false,
    default: 'alquiler'
  },
  street: {
    type: String,
    trim: true,
    maxlength: [200, 'El nombre de la calle no puede exceder 200 caracteres']
  },
  tipoEspacio: {
    type: String,
    enum: ['piso_independiente', 'club_o_plaza'],
    default: 'piso_independiente'
  },
  location: {
    provincia: {
      type: String,
      trim: true,
      maxlength: [100, 'La provincia no puede exceder 100 caracteres']
    },
    municipioZona: {
      type: String,
      trim: true,
      maxlength: [200, 'El municipio/zona no puede exceder 200 caracteres']
    },
    calleAproximada: {
      type: String,
      trim: true,
      maxlength: [200, 'La calle aproximada no puede exceder 200 caracteres']
    },
    geo: {
      center: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          default: undefined,
          validate: {
            validator: function validatorCoordinates(v) {
              if (!v) return true;
              if (!Array.isArray(v) || v.length !== 2) return false;
              const [lng, lat] = v;
              return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
            },
            message: 'Las coordenadas del centro deben ser [lng, lat] validas'
          }
        }
      },
      lat: {
        type: Number,
        min: -90,
        max: 90
      },
      lng: {
        type: Number,
        min: -180,
        max: 180
      },
      radiusMeters: {
        type: Number,
        min: 0,
        max: 10000
      },
      label: {
        type: String,
        trim: true,
        maxlength: [120, 'El nombre de zona no puede exceder 120 caracteres']
      },
      zoneKey: {
        type: String,
        trim: true,
        maxlength: [200, 'La zoneKey no puede exceder 200 caracteres']
      }
    }
  },
  servicios: {
    cocinaDigna: { type: Boolean, default: false },
    banoDigno: { type: Boolean, default: false },
    bañoDigno: { type: Boolean, default: false },
    fotosReales: { type: Boolean, default: false },
    conviveConDueno: { type: Boolean, default: false },
    conviveConDueño: { type: Boolean, default: false },
    sabanasYToallas: { type: Boolean, default: false },
    calefaccion: { type: Boolean, default: false },
    aguaCaliente: { type: Boolean, default: false },
    aireOAventilador: { type: Boolean, default: false },
    smartTv: { type: Boolean, default: false },
    malosOlores: { type: Boolean, default: false },
    wifi: { type: Boolean, default: false },
    ascensor: { type: Boolean, default: false },
    masDeUnPrimeroSinAscensor: { type: Boolean, default: false },
    problemasVecinos: { type: Boolean, default: false },
    trabaja24h: { type: Boolean, default: false },
    aceptaLgtbi: { type: Boolean, default: false },
    videoportero: { type: Boolean, default: false },
    otrosDetalles: {
      type: String,
      trim: true,
      maxlength: [1000, 'Los otros detalles no pueden exceder 1000 caracteres']
    }
  },
  anfitrion: {
    tieneVicios: {
      type: String,
      enum: ['no', 'a_veces', 'frecuentes'],
      default: 'no'
    },
    acoso: {
      type: String,
      enum: ['nunca', 'a_veces', 'frecuente'],
      default: 'nunca'
    },
    caracter: {
      type: String,
      enum: ['respetuoso', 'neutro', 'conflictivo'],
      default: 'neutro'
    },
    comentario: {
      type: String,
      trim: true,
      maxlength: [1000, 'El comentario no puede exceder 1000 caracteres']
    }
  },
  experiencia: {
    confort: {
      type: Number,
      min: 1,
      max: 5
    },
    seguridadPercibida: {
      type: Number,
      min: 1,
      max: 5
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: [2000, 'La descripcion no puede exceder 2000 caracteres']
    }
  },
  checkInOut: {
    type: String,
    enum: [
      'Llegada despues de las 15:00 y salida antes de las 12:00',
      'Llegada despuÃ©s de las 15:00 y salida antes de las 12:00',
      'Llegada y salida flexible'
    ],
    required: [true, 'El horario de entrada y salida es requerido']
  },
  depositRequired: {
    type: Boolean,
    required: [true, 'El campo de deposito es requerido']
  },
  cleaningFrequency: {
    type: String,
    enum: [
      'Nunca',
      '1 vez al mes',
      '1 vez por semana',
      '2 o mas veces por semana',
      '2 o mÃ¡s veces por semana',
      'Limpieza diaria'
    ],
    required: [true, 'La frecuencia de limpieza es requerida']
  },
  votes: {
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  votesUp: {
    type: Number,
    default: 0
  },
  votesDown: {
    type: Number,
    default: 0
  },
  reportsOpenCount: {
    type: Number,
    default: 0
  },
  reportsApprovedCount: {
    type: Number,
    default: 0
  },
  qualityScore: {
    type: Number,
    default: 0
  },
  ratings: {
    count: {
      type: Number,
      default: 0
    },
    avgConfort: {
      type: Number,
      default: 0
    },
    avgSeguridad: {
      type: Number,
      default: 0
    },
    avgGlobal: {
      type: Number,
      default: 0
    }
  },
  flags: {
    hasOpenReports: { type: Boolean, default: false },
    hasApprovedReports: { type: Boolean, default: false }
  },
  replies: [replySchema],
  views: {
    type: Number,
    default: 0
  },
  reports: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    anonymous: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

postSchema.pre('save', function syncLegacyServiceKeys(next) {
  if (this.location?.geo?.center?.coordinates?.length === 2) {
    const [lng, lat] = this.location.geo.center.coordinates;
    this.location.geo.lng = lng;
    this.location.geo.lat = lat;
  } else if (
    typeof this.location?.geo?.lng === 'number' &&
    typeof this.location?.geo?.lat === 'number'
  ) {
    this.location.geo.center = {
      type: 'Point',
      coordinates: [this.location.geo.lng, this.location.geo.lat]
    };
  }

  if (!this.servicios) return next();

  Object.entries(LEGACY_SYNC_KEYS).forEach(([legacyKey, canonicalKey]) => {
    if (this.servicios[canonicalKey] === true || this.servicios[canonicalKey] === false) {
      this.servicios[legacyKey] = this.servicios[canonicalKey];
    }
  });

  next();
});

// Indices para busqueda
postSchema.index({ community: 1, city: 1, category: 1 });
postSchema.index({ community: 1, city: 1, zonaSegura: 1 });
postSchema.index({ 'location.geo.center': '2dsphere' });
postSchema.index({ 'location.geo.zoneKey': 1 });
postSchema.index({ 'ratings.avgGlobal': -1, createdAt: -1 });
postSchema.index({ title: 'text', content: 'text' });
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);

