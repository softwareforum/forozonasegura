const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Post = require('../models/Post');
const Report = require('../models/Report');
const logger = require('../utils/logger');
const { protect } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validateObjectId');
const { validateContent } = require('../middleware/contentValidation');
const { reportLimiter } = require('../middleware/rateLimiters');
const {
  uploadReportFiles,
  MAX_FILES,
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE
} = require('../middleware/reportUpload');
const { sendReportTelegramNotification } = require('../utils/telegram');
const { getClientIp } = require('../middleware/clientIp');
const { getStorageProvider } = require('../storage/storageProvider');
const {
  normalizeServiciosInput,
  serviciosObjectToArray
} = require('../constants/services');
const {
  normalizeCheckInOut,
  normalizeCleaningFrequency,
  isValidCheckInOut,
  isValidCleaningFrequency
} = require('../constants/formOptions');
const { updateReputation, calculateVoteReputationDelta } = require('../utils/reputation');
const { recalculatePostQuality } = require('../utils/postQuality');
const { recalcPostRatings } = require('../utils/ratings');
const Activity = require('../models/Activity');

const router = express.Router();
const REVERSE_CACHE_TTL_MS = 60 * 60 * 1000;
const reverseGeoCache = new Map();

const normalizeZoneKey = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9|]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/(^-|-$)/g, '');

const buildAreaFromAddress = (address = {}) => (
  address.neighbourhood ||
  address.suburb ||
  address.city_district ||
  address.quarter ||
  address.village ||
  address.town ||
  address.municipality ||
  address.county ||
  null
);

const getRoundedGeoCacheKey = (lat, lng) => `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;

const reverseGeocodeArea = async (lat, lng) => {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  const key = getRoundedGeoCacheKey(lat, lng);
  const now = Date.now();
  const cached = reverseGeoCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.area;
  }

  if (typeof fetch !== 'function') {
    return null;
  }

  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(lat),
      lon: String(lng)
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'foro-zona-segura/1.0'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const area = buildAreaFromAddress(data?.address);
    reverseGeoCache.set(key, {
      area: area || null,
      expiresAt: now + REVERSE_CACHE_TTL_MS
    });
    return area || null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Nominatim reverse failed:', error.message);
    }
    return null;
  }
};

const isGenericZoneTitle = (title, provincia) => {
  const normalizedTitle = (title || '').trim();
  if (!normalizedTitle) return true;
  const normalizedProvincia = (provincia || '').trim();
  const escapedProvincia = normalizedProvincia.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const genericPattern = new RegExp(
    `^Zona(?:\\s.+)?\\sen\\s${escapedProvincia}(?:\\s\\(\\d+\\))?$`,
    'i'
  );
  return genericPattern.test(normalizedTitle);
};

const sanitizePlainText = (value, { maxLength = 5000 } = {}) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const toSlug = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const createActivitySafe = async ({ type, actorId, postDoc, replyId = null }) => {
  if (!postDoc?._id || !actorId) return;
  if (process.env.NODE_ENV === 'test') return;
  if (Activity?.db?.readyState !== 1) return;
  const provincia = postDoc.location?.provincia || postDoc.community || '';
  const communitySource = postDoc.community || provincia;
  try {
    await Activity.create({
      type,
      actor: actorId,
      post: postDoc._id,
      reply: replyId || null,
      communitySlug: toSlug(communitySource),
      provinceSlug: toSlug(provincia),
      category: postDoc.category || undefined
    });
  } catch (error) {
    logger.warn('Activity write failed', {
      route: '/api/posts',
      type,
      postId: postDoc._id?.toString?.() || null,
      replyId: replyId?.toString?.() || null,
      actorId: actorId?.toString?.() || null,
      error: error.message
    });
  }
};


// @route   GET /api/posts
// @desc    Obtener publicaciones con filtros
// @access  Public
const postsListValidators = [
  query('provincia').optional().trim(),
  query('community').optional().trim(),
  query('city').optional().trim(),
  query('category').optional().isIn(['piso', 'plaza', 'club']),
  query('postType').optional().isIn(['alquiler', 'traspaso', 'oferta', 'busqueda']),
  query('tipoEspacio').optional().isIn(['piso_independiente', 'club_o_plaza']),
  query('sort').optional().isIn(['recent', 'oldest', 'best', 'worst', 'top']),
  query('zonaSegura').optional().isBoolean(),
  query('bbox').optional().matches(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/),
  query('center').optional().matches(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/),
  query('radius').optional().isInt({ min: 1, max: 100000 }),
  query('center').optional().custom((value, { req }) => {
    if (value && req.query.radius === undefined) {
      throw new Error('Si envias center tambien debes enviar radius');
    }
    return true;
  }),
  query('radius').optional().custom((value, { req }) => {
    if (value && req.query.center === undefined) {
      throw new Error('Si envias radius tambien debes enviar center');
    }
    return true;
  }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 500 }).toInt()
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeSortMode = (value) => {
  if (!value) return 'recent';
  if (value === 'top') return 'best';
  return value;
};

const getPreviousVoteType = (votesDoc, userId) => {
  const id = userId.toString();
  if (votesDoc.upvotes?.some((voteUserId) => voteUserId.toString() === id)) return 'upvote';
  if (votesDoc.downvotes?.some((voteUserId) => voteUserId.toString() === id)) return 'downvote';
  return null;
};

const buildGeoFilter = (reqQuery) => {
  if (reqQuery.bbox) {
    const [minLng, minLat, maxLng, maxLat] = reqQuery.bbox.split(',').map(Number);
    return {
      'location.geo.center': {
        $geoWithin: {
          $box: [
            [minLng, minLat],
            [maxLng, maxLat]
          ]
        }
      }
    };
  }

  if (reqQuery.center && reqQuery.radius) {
    const [lng, lat] = reqQuery.center.split(',').map(Number);
    const radiusMeters = Number(reqQuery.radius);
    return {
      'location.geo.center': {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusMeters / 6378137]
        }
      }
    };
  }

  return {};
};

const listPostsHandler = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { isDeleted: false };

    const provinciaOrCommunity = req.query.provincia || req.query.community;
    if (provinciaOrCommunity) {
      const exactRegex = new RegExp(`^${escapeRegex(provinciaOrCommunity)}$`, 'i');
      filter.$or = [
        { 'location.provincia': exactRegex },
        { community: exactRegex }
      ];
    }

    if (req.query.city) filter.city = req.query.city;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.postType) filter.postType = req.query.postType;
    if (req.query.tipoEspacio) filter.tipoEspacio = req.query.tipoEspacio;
    if (req.query.zonaSegura !== undefined) {
      filter.zonaSegura = req.query.zonaSegura === 'true' || req.query.zonaSegura === true;
    }
    Object.assign(filter, buildGeoFilter(req.query));

    // Búsqueda por texto
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    const sortMode = normalizeSortMode(req.query.sort);
    const hasTextSearch = !!req.query.search;
    const sortStage = {};

    if (sortMode === 'best') {
      sortStage.ratingsAvgGlobalComputed = -1;
      if (hasTextSearch) sortStage.textScore = -1;
      sortStage.createdAt = -1;
    } else if (sortMode === 'worst') {
      sortStage.ratingsAvgGlobalComputed = 1;
      if (hasTextSearch) sortStage.textScore = -1;
      sortStage.createdAt = -1;
    } else if (sortMode === 'oldest') {
      if (hasTextSearch) sortStage.textScore = -1;
      sortStage.createdAt = 1;
    } else {
      if (hasTextSearch) sortStage.textScore = -1;
      sortStage.createdAt = -1;
    }

    const posts = await Post.aggregate([
      { $match: filter },
      {
        $addFields: {
          votesUpComputed: {
            $ifNull: ['$votesUp', { $size: { $ifNull: ['$votes.upvotes', []] } }]
          },
          votesDownComputed: {
            $ifNull: ['$votesDown', { $size: { $ifNull: ['$votes.downvotes', []] } }]
          },
          reportsOpenCountComputed: {
            $ifNull: ['$reportsOpenCount', 0]
          },
          reportsApprovedCountComputed: {
            $ifNull: ['$reportsApprovedCount', 0]
          }
        }
      },
      {
        $addFields: {
          qualityScoreComputed: {
            $add: [
              {
                $subtract: [
                  { $subtract: ['$votesUpComputed', '$votesDownComputed'] },
                  {
                    $add: [
                      { $multiply: ['$reportsOpenCountComputed', 3] },
                      { $multiply: ['$reportsApprovedCountComputed', 15] }
                    ]
                  }
                ]
              },
              {
                $cond: [
                  {
                    $and: [
                      { $gt: [{ $subtract: ['$votesUpComputed', '$votesDownComputed'] }, 0] },
                      { $eq: ['$reportsOpenCountComputed', 0] },
                      { $eq: ['$reportsApprovedCountComputed', 0] }
                    ]
                  },
                  2,
                  0
                ]
              }
            ]
          },
          qualityScore: '$qualityScoreComputed',
          flags: {
            hasOpenReports: { $gt: ['$reportsOpenCountComputed', 0] },
            hasApprovedReports: { $gt: ['$reportsApprovedCountComputed', 0] }
          }
        }
      },
      {
        $addFields: {
          ratingSamplesComputed: {
            $concatArrays: [
              {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$experiencia.confort', 1] },
                      { $lte: ['$experiencia.confort', 5] },
                      { $gte: ['$experiencia.seguridadPercibida', 1] },
                      { $lte: ['$experiencia.seguridadPercibida', 5] }
                    ]
                  },
                  [{ confort: '$experiencia.confort', seguridad: '$experiencia.seguridadPercibida' }],
                  []
                ]
              },
              {
                $map: {
                  input: {
                    $filter: {
                      input: { $ifNull: ['$replies', []] },
                      as: 'reply',
                      cond: {
                        $and: [
                          { $ne: ['$$reply.isDeleted', true] },
                          { $gte: ['$$reply.experiencia.confort', 1] },
                          { $lte: ['$$reply.experiencia.confort', 5] },
                          { $gte: ['$$reply.experiencia.seguridadPercibida', 1] },
                          { $lte: ['$$reply.experiencia.seguridadPercibida', 5] }
                        ]
                      }
                    }
                  },
                  as: 'reply',
                  in: {
                    confort: '$$reply.experiencia.confort',
                    seguridad: '$$reply.experiencia.seguridadPercibida'
                  }
                }
              }
            ]
          }
        }
      },
      {
        $addFields: {
          ratingsCountComputed: { $size: '$ratingSamplesComputed' },
          ratingsConfortTotalComputed: { $sum: '$ratingSamplesComputed.confort' },
          ratingsSeguridadTotalComputed: { $sum: '$ratingSamplesComputed.seguridad' }
        }
      },
      {
        $addFields: {
          ratingsAvgConfortComputed: {
            $cond: [
              { $gt: ['$ratingsCountComputed', 0] },
              { $round: [{ $divide: ['$ratingsConfortTotalComputed', '$ratingsCountComputed'] }, 1] },
              0
            ]
          },
          ratingsAvgSeguridadComputed: {
            $cond: [
              { $gt: ['$ratingsCountComputed', 0] },
              { $round: [{ $divide: ['$ratingsSeguridadTotalComputed', '$ratingsCountComputed'] }, 1] },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          ratingsAvgGlobalComputed: {
            $cond: [
              { $gt: ['$ratingsCountComputed', 0] },
              {
                $round: [
                  {
                    $divide: [
                      { $add: ['$ratingsAvgConfortComputed', '$ratingsAvgSeguridadComputed'] },
                      2
                    ]
                  },
                  1
                ]
              },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          ratings: {
            count: '$ratingsCountComputed',
            avgConfort: '$ratingsAvgConfortComputed',
            avgSeguridad: '$ratingsAvgSeguridadComputed',
            avgGlobal: '$ratingsAvgGlobalComputed'
          }
        }
      },
      ...(hasTextSearch
        ? [{
            $addFields: {
              textScore: { $meta: 'textScore' }
            }
          }]
        : []),
      { $sort: sortStage },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          pipeline: [{ $project: { username: 1, reputation: 1, level: 1 } }],
          as: 'author'
        }
      },
      { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } }
    ]);

    const total = await Post.countDocuments(filter);

    res.json({
      success: true,
      posts,
      appliedSort: sortMode,
      appliedTipoEspacio: req.query.tipoEspacio || null,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo posts:', {
      query: req.query,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      message: 'Error al obtener publicaciones'
    });
  }
};

router.get('/', postsListValidators, listPostsHandler);
router.get('/map', postsListValidators, listPostsHandler);

// @route   GET /api/posts/:id
// @desc    Obtener una publicación específica
// @access  Public
router.get('/:id', validateObjectId('id'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username reputation level isVerified verificationType')
      .populate('replies.author', 'username reputation level');

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Publicación no encontrada'
      });
    }

    recalcPostRatings(post);

    // Incrementar vistas
    post.views += 1;
    await post.save();

    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Error obteniendo post por ID:', {
      postId: req.params.id,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    // Manejar errores específicos de MongoDB
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de publicación inválido'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al obtener publicación'
    });
  }
});

// @route   POST /api/posts
// @desc    Crear nueva publicación
// @access  Private (usuarios autenticados, no baneados)
router.post('/', protect, validateContent, [
  body('title')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('El titulo no puede exceder 200 caracteres'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 10000 })
    .withMessage('El contenido no puede exceder 10000 caracteres'),
  body('category')
    .optional()
    .isIn(['piso', 'plaza', 'club'])
    .withMessage('Categoría inválida'),
  body('community')
    .optional()
    .trim(),
  body('city')
    .optional()
    .trim(),
  body('postType')
    .optional()
    .isIn(['alquiler', 'traspaso', 'oferta', 'busqueda'])
    .withMessage('Tipo de publicación inválido'),
  body('tipoEspacio')
    .isIn(['piso_independiente', 'club_o_plaza'])
    .withMessage('Tipo de espacio inválido'),
  body('location.provincia')
    .notEmpty()
    .withMessage('La provincia es requerida')
    .trim()
    .isLength({ max: 100 })
    .withMessage('La provincia no puede exceder 100 caracteres'),
  body('location.municipioZona')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('El municipio/zona no puede exceder 200 caracteres'),
  body('location.calleAproximada')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La calle aproximada no puede exceder 200 caracteres'),
  body('location.geo.lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitud inválida'),
  body('location.geo.lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitud inválida'),
  body('location.geo.radiusMeters')
    .notEmpty()
    .withMessage('location.geo.radiusMeters es requerido')
    .isInt({ min: 100, max: 10000 })
    .withMessage('location.geo.radiusMeters debe estar entre 100 y 10000'),
  body('location.geo.center.type')
    .notEmpty()
    .withMessage('location.geo.center.type es requerido')
    .equals('Point')
    .withMessage('location.geo.center.type debe ser "Point"'),
  body('location.geo.center.coordinates')
    .notEmpty()
    .withMessage('location.geo.center.coordinates es requerido')
    .isArray({ min: 2, max: 2 })
    .withMessage('location.geo.center.coordinates debe ser [lng, lat]'),
  body('location.geo.center.coordinates.0')
    .notEmpty()
    .withMessage('Longitud del centro requerida')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitud del centro invalida'),
  body('location.geo.center.coordinates.1')
    .notEmpty()
    .withMessage('Latitud del centro requerida')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitud del centro invalida'),
  body('experiencia.confort')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Confort debe estar entre 1 y 5'),
  body('experiencia.seguridadPercibida')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Seguridad percibida debe estar entre 1 y 5'),
  body('servicios')
    .optional()
    .custom((value) => {
      const { errors } = normalizeServiciosInput(value);
      if (errors.length > 0) {
        throw new Error(errors.join(' | '));
      }
      return true;
    }),
  body('checkInOut')
    .custom((value) => isValidCheckInOut(value))
    .withMessage('El horario de entrada y salida es requerido y debe ser una opción válida'),
  body('depositRequired')
    .isBoolean()
    .withMessage('El campo de depósito es requerido y debe ser un valor booleano'),
  body('cleaningFrequency')
    .custom((value) => isValidCleaningFrequency(value))
    .withMessage('La frecuencia de limpieza es requerida y debe ser una opción válida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { 
      title, 
      content, 
      category, 
      community, 
      city, 
      postType, 
      street,
      tipoEspacio,
      location,
      servicios,
      anfitrion,
      experiencia,
      checkInOut,
      depositRequired,
      cleaningFrequency
    } = req.body;

    // Seguridad: no permitir label manual por API. Se ignora silenciosamente.
    if (req.body.zoneLabel || req.body.labelManual || req.body?.location?.geo?.labelOverride) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Ignoring manual zone label fields in POST /api/posts');
      }
      delete req.body.zoneLabel;
      delete req.body.labelManual;
      if (req.body.location?.geo) {
        delete req.body.location.geo.labelOverride;
      }
    }

    // Construir objeto de post con compatibilidad hacia atrás
    const { servicios: normalizedServicios, errors: serviciosErrors } = normalizeServiciosInput(servicios);
    if (serviciosErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: serviciosErrors.map(msg => ({ msg, param: 'servicios' }))
      });
    }

    let postData = {
      title,
      content: content || '', // Mantener para compatibilidad, pero ya no se usa en el formulario
      category: category || (tipoEspacio === 'club_o_plaza' ? 'club' : 'piso'), // Mapeo automático
      community: community || location?.provincia || '',
      city: city || location?.municipioZona || '',
      postType: postType || 'alquiler', // Default para compatibilidad
      street: street || location?.calleAproximada || '',
      author: req.user._id
    };


    let normalizedLocation = location;
    if (location) {
      const geo = location.geo || {};
      const hasCenter = Array.isArray(geo?.center?.coordinates) && geo.center.coordinates.length === 2;
      const hasLegacyLatLng = typeof geo?.lng === 'number' && typeof geo?.lat === 'number';

      if (hasCenter || hasLegacyLatLng) {
        const coordinates = hasCenter ? geo.center.coordinates : [geo.lng, geo.lat];
        normalizedLocation = {
          ...location,
          geo: {
            ...geo,
            center: {
              type: 'Point',
              coordinates
            },
            lng: coordinates[0],
            lat: coordinates[1],
            radiusMeters: Number(geo.radiusMeters || 600)
          }
        };
      }
    }
    const provincia = normalizedLocation?.provincia || location?.provincia || '';
    const centerCoordinates = normalizedLocation?.geo?.center?.coordinates;
    let resolvedArea = null;

    if (Array.isArray(centerCoordinates) && centerCoordinates.length === 2) {
      const [lng, lat] = centerCoordinates;
      const reverseArea = await reverseGeocodeArea(lat, lng);
      if (reverseArea) {
        resolvedArea = reverseArea.trim().slice(0, 120);
      }
    }

    if (normalizedLocation?.geo) {
      normalizedLocation.geo.label = resolvedArea || null;
      normalizedLocation.geo.zoneKey = resolvedArea
        ? normalizeZoneKey(`${provincia}|${resolvedArea}`)
        : null;
    }

    const baseTitle = resolvedArea
      ? `Zona ${resolvedArea} en ${provincia}`
      : `Zona en ${provincia}`;
    let generatedTitle = baseTitle;

    if (normalizedLocation?.geo?.zoneKey) {
      const countInZone = await Post.countDocuments({
        'location.geo.zoneKey': normalizedLocation.geo.zoneKey,
        isDeleted: false
      });
      if (countInZone >= 1) {
        generatedTitle = `${baseTitle} (${countInZone + 1})`;
      }
    }

    const finalTitle = isGenericZoneTitle(title, provincia) ? generatedTitle : title;
    postData = {
      ...postData,
      title: finalTitle,
      community: postData.community || provincia || ''
    };
    // Agregar nuevos campos si estan presentes
    if (tipoEspacio) postData.tipoEspacio = tipoEspacio;
    if (normalizedLocation) postData.location = normalizedLocation;
    if (servicios) postData.servicios = normalizedServicios;
    if (anfitrion) postData.anfitrion = anfitrion;
    if (experiencia) {
      postData.experiencia = {
        ...experiencia,
        confort: experiencia.confort !== undefined ? Number(experiencia.confort) : undefined,
        seguridadPercibida: experiencia.seguridadPercibida !== undefined ? Number(experiencia.seguridadPercibida) : undefined
      };
    }
    if (checkInOut) postData.checkInOut = normalizeCheckInOut(checkInOut);
    if (depositRequired !== undefined) postData.depositRequired = depositRequired;
    if (cleaningFrequency) postData.cleaningFrequency = normalizeCleaningFrequency(cleaningFrequency);

    const post = await Post.create(postData);
    recalcPostRatings(post);
    await post.save();
    await updateReputation(req.user._id, 3, 'post_create', { postId: post._id.toString() });
    await recalculatePostQuality(post._id);
    await createActivitySafe({
      type: 'post',
      actorId: req.user._id,
      postDoc: post
    });

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username reputation level');

    res.status(201).json({
      success: true,
      post: populatedPost
    });
  } catch (error) {
    console.error('Error creando post:', {
      userId: req.user?._id,
      category: req.body.category,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al crear publicación'
    });
  }
});

// @route   POST /api/posts/:id/replies
// @desc    Responder a una publicación con formulario estructurado
// @access  Private
router.post('/:id/replies', protect, validateObjectId('id'), [
  body().custom((value, { req }) => {
    const incomingServicios = req.body.servicios !== undefined ? req.body.servicios : req.body.amenities;
    const { errors } = normalizeServiciosInput(incomingServicios);
    if (errors.length > 0) {
      throw new Error(`Servicios invalidos: ${errors.join(' | ')}`);
    }
    return true;
  }),
  body('anfitrion.tieneVicios')
    .optional()
    .isIn(['no', 'a_veces', 'frecuentes'])
    .withMessage('anfitrion.tieneVicios invalido'),
  body('anfitrion.acoso')
    .optional()
    .isIn(['nunca', 'a_veces', 'frecuente'])
    .withMessage('anfitrion.acoso invalido'),
  body('anfitrion.caracter')
    .optional()
    .isIn(['respetuoso', 'neutro', 'conflictivo'])
    .withMessage('anfitrion.caracter invalido'),
  body('experiencia.confort')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('experiencia.confort debe estar entre 1 y 5'),
  body('experiencia.seguridadPercibida')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('experiencia.seguridadPercibida debe estar entre 1 y 5'),
  body('checkInOut')
    .custom((value) => isValidCheckInOut(value))
    .withMessage('El horario de entrada y salida es requerido y debe ser una opción válida'),
  body('depositRequired')
    .isBoolean()
    .withMessage('El campo de depósito es requerido y debe ser un valor booleano'),
  body('cleaningFrequency')
    .custom((value) => isValidCleaningFrequency(value))
    .withMessage('La frecuencia de limpieza es requerida y debe ser una opción válida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const post = await Post.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Publicación no encontrada'
      });
    }

    if (post.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'Esta publicación está bloqueada'
      });
    }
    const incomingServicios = req.body.servicios !== undefined ? req.body.servicios : req.body.amenities;
    const { servicios: normalizedServicios, errors: serviciosErrors } = normalizeServiciosInput(incomingServicios);
    if (serviciosErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: serviciosErrors.map(msg => ({ msg, param: 'servicios' }))
      });
    }

    const reply = {
      author: req.user._id,
      servicios: normalizedServicios,
      amenities: serviciosObjectToArray(normalizedServicios), // legacy temporal
      anfitrion: req.body.anfitrion || undefined,
      experiencia: req.body.experiencia
        ? {
            ...req.body.experiencia,
            confort: req.body.experiencia.confort !== undefined ? Number(req.body.experiencia.confort) : undefined,
            seguridadPercibida: req.body.experiencia.seguridadPercibida !== undefined
              ? Number(req.body.experiencia.seguridadPercibida)
              : undefined
          }
        : undefined,
      checkInOut: normalizeCheckInOut(req.body.checkInOut),
      depositRequired: req.body.depositRequired,
      cleaningFrequency: normalizeCleaningFrequency(req.body.cleaningFrequency)
    };

    post.replies.push(reply);
    recalcPostRatings(post);
    await post.save();
    await recalculatePostQuality(post._id);
    await updateReputation(req.user._id, 1, 'reply_create', {
      postId: post._id.toString()
    });
    const createdReply = post.replies[post.replies.length - 1];
    await createActivitySafe({
      type: 'reply',
      actorId: req.user._id,
      postDoc: post,
      replyId: createdReply?._id || null
    });

    // Obtener la respuesta recién creada (última del array)
    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username reputation level')
      .populate('replies.author', 'username reputation level');
    
    const newReply = populatedPost.replies[populatedPost.replies.length - 1];

    res.status(201).json({
      success: true,
      reply: newReply,
      post: populatedPost
    });
  } catch (error) {
    console.error('Error creando respuesta:', {
      postId: req.params.id,
      userId: req.user?._id,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de publicación inválido'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al crear respuesta'
    });
  }
});

// @route   POST /api/posts/:id/vote
// @desc    Votar una publicación
// @access  Private
router.post('/:id/vote', protect, validateObjectId('id'), [
  body('type').isIn(['upvote', 'downvote']).withMessage('Tipo de voto inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const post = await Post.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Publicación no encontrada'
      });
    }

    const userId = req.user._id;
    const voteType = req.body.type;
    const previousVote = getPreviousVoteType(post.votes, userId);

    // Remover votos previos del usuario
    post.votes.upvotes = post.votes.upvotes.filter(
      id => id.toString() !== userId.toString()
    );
    post.votes.downvotes = post.votes.downvotes.filter(
      id => id.toString() !== userId.toString()
    );

    // Añadir nuevo voto
    if (voteType === 'upvote') {
      post.votes.upvotes.push(userId);
    } else {
      post.votes.downvotes.push(userId);
    }

    await post.save();

    const reputationDelta = calculateVoteReputationDelta({
      previousVote,
      nextVote: voteType,
      targetType: 'post'
    });
    if (reputationDelta !== 0) {
      await updateReputation(post.author, reputationDelta, 'post_vote_received', {
        postId: post._id.toString(),
        voterId: userId.toString()
      });
    }

    res.json({
      success: true,
      votes: {
        upvotes: post.votes.upvotes.length,
        downvotes: post.votes.downvotes.length
      }
    });
  } catch (error) {
    console.error('Error votando post:', {
      postId: req.params.id,
      userId: req.user?._id,
      voteType: req.body.type,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de publicación inválido'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al votar'
    });
  }
});

// @route   POST /api/posts/:postId/replies/:replyId/vote
// @desc    Votar una respuesta
// @access  Private
router.post('/:postId/replies/:replyId/vote', protect, [validateObjectId('postId'), validateObjectId('replyId')], [
  body('type').isIn(['upvote', 'downvote']).withMessage('Tipo de voto inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const post = await Post.findById(req.params.postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Publicación no encontrada'
      });
    }

    const reply = post.replies.id(req.params.replyId);
    if (!reply || reply.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Respuesta no encontrada'
      });
    }

    const userId = req.user._id;
    const voteType = req.body.type;
    const previousVote = getPreviousVoteType(reply.votes, userId);

    reply.votes.upvotes = reply.votes.upvotes.filter(
      (id) => id.toString() !== userId.toString()
    );
    reply.votes.downvotes = reply.votes.downvotes.filter(
      (id) => id.toString() !== userId.toString()
    );

    if (voteType === 'upvote') {
      reply.votes.upvotes.push(userId);
    } else {
      reply.votes.downvotes.push(userId);
    }

    await post.save();
    await recalculatePostQuality(post._id);

    const reputationDelta = calculateVoteReputationDelta({
      previousVote,
      nextVote: voteType,
      targetType: 'reply'
    });
    if (reputationDelta !== 0) {
      await updateReputation(reply.author, reputationDelta, 'reply_vote_received', {
        postId: post._id.toString(),
        replyId: reply._id.toString(),
        voterId: userId.toString()
      });
    }

    return res.json({
      success: true,
      replyId: reply._id,
      votes: {
        upvotes: reply.votes.upvotes.length,
        downvotes: reply.votes.downvotes.length
      }
    });
  } catch (error) {
    console.error('Error votando respuesta:', {
      postId: req.params.postId,
      replyId: req.params.replyId,
      userId: req.user?._id,
      voteType: req.body.type,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    return res.status(500).json({
      success: false,
      message: 'Error al votar respuesta'
    });
  }
});

// @route   POST /api/posts/:id/report
// @desc    Reportar una publicación
// @access  Private
router.post('/:id/report', protect, reportLimiter, validateObjectId('id'), (req, res, next) => {
  uploadReportFiles(req, res, (err) => {
    if (!err) return next();
    logger.warn('Report upload validation failed', {
      route: '/api/posts/:id/report',
      postId: req.params.id,
      userId: req.user?._id?.toString?.() || null,
      ip: getClientIp(req),
      error: err.message
    });
    return res.status(400).json({
      success: false,
      code: 'REPORT_UPLOAD_INVALID',
      errors: [{ msg: err.message || 'Adjuntos invalidos', param: 'files' }]
    });
  });
}, (req, _res, next) => {
  if (!req.body.message && req.body.reason) {
    req.body.message = req.body.reason;
  }
  if (!req.body.role) {
    req.body.role = 'inquilino';
  }
  next();
}, [
  body('role')
    .notEmpty()
    .withMessage('role es obligatorio')
    .isIn(['inquilino', 'facilita_espacio'])
    .withMessage('role invalido'),
  body('message')
    .trim()
    .isLength({ min: 20 })
    .withMessage('El motivo del reporte es obligatorio (minimo 20 caracteres)'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Email invalido'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[+()\-\s0-9]{6,25}$/)
    .withMessage('Telefono invalido')
], async (req, res) => {
  const files = req.files || [];
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Report validation failed', {
        route: '/api/posts/:id/report',
        postId: req.params.id,
        userId: req.user?._id?.toString?.() || null,
        ip: getClientIp(req),
        errors: errors.array().map((e) => ({ param: e.param, msg: e.msg }))
      });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const post = await Post.findById(req.params.id).select('title location community zonaSegura');
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Publicacion no encontrada'
      });
    }

    if (files.length > MAX_FILES) {
      return res.status(400).json({
        success: false,
        errors: [{ msg: `Se permiten maximo ${MAX_FILES} adjuntos`, param: 'files' }]
      });
    }

    const totalSize = files.reduce((acc, file) => acc + (file.size || 0), 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      return res.status(400).json({
        success: false,
        errors: [{ msg: `El peso total de adjuntos no puede superar ${Math.round(MAX_TOTAL_SIZE / (1024 * 1024))}MB`, param: 'files' }]
      });
    }

    const tooBigFile = files.find((file) => file.size > MAX_FILE_SIZE);
    if (tooBigFile) {
      return res.status(400).json({
        success: false,
        errors: [{ msg: `Archivo demasiado grande: ${tooBigFile.originalname}`, param: 'files' }]
      });
    }

    const role = sanitizePlainText(req.body.role, { maxLength: 30 });
    const message = sanitizePlainText(req.body.message, { maxLength: 5000 });
    const reporter = {
      name: sanitizePlainText(req.body.name, { maxLength: 120 }) || undefined,
      email: sanitizePlainText(req.body.email, { maxLength: 200 }).toLowerCase() || undefined,
      phone: sanitizePlainText(req.body.phone, { maxLength: 40 }) || undefined
    };

    const report = await Report.create({
      postId: post._id,
      role,
      reporter,
      message,
      attachments: [],
      status: 'open',
      meta: {
        ip: getClientIp(req),
        userId: req.user?._id,
        userAgent: sanitizePlainText(req.headers['user-agent'] || '', { maxLength: 400 })
      },
      metadata: {
        ip: getClientIp(req),
        userId: req.user?._id,
        userAgent: sanitizePlainText(req.headers['user-agent'] || '', { maxLength: 400 })
      }
    });

    const storageProvider = getStorageProvider();
    const attachments = await storageProvider.saveFiles(files, { postId: post._id, reportId: report._id });
    report.attachments = attachments;
    await report.save();

    const openReportsCount = await Report.countDocuments({ postId: post._id, status: 'open' });
    if (openReportsCount >= 3 && post.zonaSegura) {
      post.zonaSegura = false;
      await post.save();
    }
    await recalculatePostQuality(post._id);

    const postUrlBase = (process.env.CLIENT_URL || '').replace(/\/$/, '');
    const postUrl = postUrlBase ? `${postUrlBase}/post/${post._id}` : null;
    try {
      await sendReportTelegramNotification({
        post,
        report,
        attachments: files.map((file, index) => ({
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          buffer: file.buffer,
          pathOrUrl: attachments[index]?.pathOrUrl,
          publicUrl: attachments[index]?.publicUrl
        })),
        postUrl
      });
    } catch (telegramError) {
      logger.warn('Telegram notification failed for report', {
        route: '/api/posts/:id/report',
        postId: post._id.toString(),
        userId: req.user?._id?.toString?.() || null,
        ip: getClientIp(req),
        error: telegramError.message
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Reporte enviado correctamente. Gracias por tu colaboracion.',
      reportId: report._id
    });
  } catch (error) {
    logger.error('Report create failed', {
      route: '/api/posts/:id/report',
      postId: req.params.id,
      userId: req.user?._id?.toString?.() || null,
      ip: getClientIp(req),
      error: error.message
    });

    return res.status(500).json({
      success: false,
      message: 'Error al reportar publicacion'
    });
  }
});
// @route   PUT /api/posts/:id
// @desc    Actualizar publicación
// @access  Private (solo autor o moderador)
router.put('/:id', protect, validateObjectId('id'), validateContent, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Publicación no encontrada'
      });
    }

    // Solo el autor o moderadores pueden editar
    if (post.author.toString() !== req.user._id.toString() && 
        !['moderador', 'administrador'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para editar esta publicación'
      });
    }

    const { title, content, postType, street, experiencia } = req.body;
    let shouldRecalcRatings = false;
    if (title) post.title = title;
    if (content) post.content = content;
    if (postType) post.postType = postType;
    if (street !== undefined) post.street = street;
    if (experiencia) {
      post.experiencia = {
        ...post.experiencia,
        ...experiencia,
        confort: experiencia.confort !== undefined ? Number(experiencia.confort) : post.experiencia?.confort,
        seguridadPercibida:
          experiencia.seguridadPercibida !== undefined
            ? Number(experiencia.seguridadPercibida)
            : post.experiencia?.seguridadPercibida
      };
      shouldRecalcRatings = true;
    }
    if (shouldRecalcRatings) {
      recalcPostRatings(post);
    }
    post.updatedAt = Date.now();

    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username reputation level');

    res.json({
      success: true,
      post: populatedPost
    });
  } catch (error) {
    console.error('Error actualizando post:', {
      postId: req.params.id,
      userId: req.user?._id,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de publicación inválido'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar publicación'
    });
  }
});

module.exports = router;










