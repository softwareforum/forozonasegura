const express = require('express');
const { body, query } = require('express-validator');
const ResourceSubmission = require('../models/ResourceSubmission');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { resourceSubmissionLimiter } = require('../middleware/rateLimiters');
const { getClientIp } = require('../middleware/clientIp');
const { validateObjectId } = require('../middleware/validateObjectId');
const logger = require('../utils/logger');

const router = express.Router();

const RESOURCE_TYPE_LABELS = {
  ong: 'ONG',
  clinica: 'Clínica',
  asesoria_legal: 'Asesoría legal',
  psicologia: 'Psicología',
  trabajo_social: 'Trabajo social',
  otro: 'Otro'
};

const COVERAGE_LABELS = {
  local: 'Local',
  provincial: 'Provincial',
  nacional: 'Nacional',
  online: 'Online'
};

const CATEGORY_CONFIG = {
  emergencia_seguridad: {
    id: 'emergencia_seguridad',
    title: 'Emergencia y seguridad',
    description: 'Recursos inmediatos ante riesgo, amenazas o situación de peligro.',
    resourceTypes: ['ong', 'trabajo_social']
  },
  violencia_proteccion: {
    id: 'violencia_proteccion',
    title: 'Violencia y protección',
    description: 'Orientación para denuncias, medidas de protección y acompañamiento.',
    resourceTypes: ['ong', 'asesoria_legal', 'trabajo_social']
  },
  salud_sexual_mental: {
    id: 'salud_sexual_mental',
    title: 'Salud sexual y mental',
    description: 'Atención sanitaria, salud sexual, salud mental y seguimiento clínico.',
    resourceTypes: ['clinica', 'psicologia']
  },
  asesoria_legal_derechos: {
    id: 'asesoria_legal_derechos',
    title: 'Asesoría legal y derechos',
    description: 'Consultas jurídicas, derechos laborales y apoyo ante conflictos legales.',
    resourceTypes: ['asesoria_legal', 'ong']
  },
  acompanamiento_social: {
    id: 'acompanamiento_social',
    title: 'Acompañamiento social y ayudas',
    description: 'Acceso a ayudas, intermediación social y acompañamiento profesional.',
    resourceTypes: ['trabajo_social', 'ong']
  },
  migracion_regularizacion: {
    id: 'migracion_regularizacion',
    title: 'Migración y regularización',
    description: 'Información de extranjería, regularización y acceso a servicios básicos.',
    resourceTypes: ['asesoria_legal', 'ong', 'trabajo_social']
  },
  adicciones_reduccion_dano: {
    id: 'adicciones_reduccion_dano',
    title: 'Adicciones y reducción de daño',
    description: 'Programas de reducción de daño, apoyo terapéutico y derivación asistida.',
    resourceTypes: ['clinica', 'psicologia', 'ong']
  },
  lgtbi_apoyo: {
    id: 'lgtbi_apoyo',
    title: 'LGTBIQ+ y apoyo específico',
    description: 'Recursos con enfoque inclusivo para personas LGTBIQ+.',
    resourceTypes: ['ong', 'trabajo_social', 'psicologia']
  }
};

const CATEGORY_ORDER = [
  'emergencia_seguridad',
  'violencia_proteccion',
  'salud_sexual_mental',
  'asesoria_legal_derechos',
  'acompanamiento_social',
  'migracion_regularizacion',
  'adicciones_reduccion_dano',
  'lgtbi_apoyo'
];

const ADMIN_RESOURCE_EMAILS = (process.env.ADMIN_RESOURCE_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const sanitizeText = (value, maxLength = 500) => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, maxLength);

const canManageResources = (user) => {
  if (!user) return false;
  if (['moderador', 'administrador'].includes(user.role)) return true;
  const email = (user.email || '').toLowerCase();
  return !!email && ADMIN_RESOURCE_EMAILS.includes(email);
};

const toResourceDTO = (doc) => ({
  id: doc._id,
  entityName: doc.entityName,
  resourceType: doc.resourceType,
  resourceTypeLabel: RESOURCE_TYPE_LABELS[doc.resourceType] || doc.resourceType,
  cityProvince: doc.cityProvince,
  coverage: doc.coverage,
  coverageLabel: COVERAGE_LABELS[doc.coverage] || doc.coverage,
  website: doc.website || '',
  phone: doc.phone || '',
  email: doc.email || '',
  description: doc.description,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildGroupedApprovedResources = (resources) => {
  const grouped = {};
  CATEGORY_ORDER.forEach((categoryId) => {
    grouped[categoryId] = {
      ...CATEGORY_CONFIG[categoryId],
      resources: []
    };
  });

  resources.forEach((resource) => {
    const dto = toResourceDTO(resource);
    CATEGORY_ORDER.forEach((categoryId) => {
      if (CATEGORY_CONFIG[categoryId].resourceTypes.includes(resource.resourceType)) {
        grouped[categoryId].resources.push(dto);
      }
    });
  });

  return grouped;
};

const adminOnly = (req, res, next) => {
  if (!canManageResources(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'No tienes permisos para gestionar recursos.'
    });
  }
  return next();
};

router.get('/', async (_req, res) => {
  try {
    const resources = await ResourceSubmission.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(500);

    return res.json({
      success: true,
      categories: CATEGORY_ORDER.map((categoryId) => CATEGORY_CONFIG[categoryId]),
      resourcesByCategory: buildGroupedApprovedResources(resources)
    });
  } catch (error) {
    logger.error('Failed to fetch approved professional resources', {
      route: '/api/professional-resources',
      error: error.message
    });
    return res.status(500).json({
      success: false,
      message: 'Error al obtener recursos profesionales'
    });
  }
});

router.post('/submissions', resourceSubmissionLimiter, protect, [
  body('entityName')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Nombre de la entidad inválido'),
  body('resourceType')
    .isIn(['ong', 'clinica', 'asesoria_legal', 'psicologia', 'trabajo_social', 'otro'])
    .withMessage('Tipo de recurso inválido'),
  body('cityProvince')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Ciudad / provincia es obligatoria'),
  body('coverage')
    .isIn(['local', 'provincial', 'nacional', 'online'])
    .withMessage('Cobertura inválida'),
  body('website')
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: true })
    .withMessage('La web debe incluir protocolo (https://...)'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[+()\-\s0-9]{6,25}$/)
    .withMessage('Teléfono inválido'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Email inválido'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 800 })
    .withMessage('Descripcion obligatoria (20 a 800 caracteres)'),
  body('consent')
    .custom((value) => value === true || value === 'true' || value === 1 || value === '1')
    .withMessage('Debes confirmar el consentimiento'),
  handleValidationErrors
], async (req, res) => {
  try {
    const submission = await ResourceSubmission.create({
      entityName: sanitizeText(req.body.entityName, 120),
      resourceType: req.body.resourceType,
      cityProvince: sanitizeText(req.body.cityProvince, 120),
      coverage: req.body.coverage,
      website: sanitizeText(req.body.website, 300) || undefined,
      phone: sanitizeText(req.body.phone, 40) || undefined,
      email: sanitizeText(req.body.email, 200).toLowerCase() || undefined,
      description: sanitizeText(req.body.description, 800),
      consent: true,
      status: 'pending',
      submittedBy: req.user?._id,
      meta: {
        ip: getClientIp(req),
        userAgent: sanitizeText(req.headers['user-agent'] || '', 400)
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Solicitud enviada correctamente. Quedará pendiente de revisión.',
      submissionId: submission._id,
      status: submission.status
    });
  } catch (error) {
    logger.error('Failed to create professional resource submission', {
      route: '/api/professional-resources/submissions',
      userId: req.user?._id?.toString?.() || null,
      ip: getClientIp(req),
      error: error.message
    });
    return res.status(500).json({
      success: false,
      message: 'No se pudo enviar la solicitud. Inténtalo más tarde.'
    });
  }
});

router.get('/submissions', protect, adminOnly, [
  query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Estado inválido'),
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Límite inválido'),
  handleValidationErrors
], async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ResourceSubmission.find({ status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('submittedBy', 'username email')
        .populate('reviewedBy', 'username email'),
      ResourceSubmission.countDocuments({ status })
    ]);

    return res.json({
      success: true,
      submissions: items.map((item) => ({
        ...toResourceDTO(item),
        reviewNote: item.reviewNote || '',
        submittedBy: item.submittedBy ? {
          id: item.submittedBy._id,
          username: item.submittedBy.username,
          email: item.submittedBy.email
        } : null,
        reviewedBy: item.reviewedBy ? {
          id: item.reviewedBy._id,
          username: item.reviewedBy.username,
          email: item.reviewedBy.email
        } : null,
        reviewedAt: item.reviewedAt || null
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Failed to list professional resource submissions', {
      route: '/api/professional-resources/submissions',
      userId: req.user?._id?.toString?.() || null,
      ip: getClientIp(req),
      error: error.message
    });
    return res.status(500).json({
      success: false,
      message: 'No se pudieron obtener las solicitudes.'
    });
  }
});

router.patch('/submissions/:id', protect, adminOnly, validateObjectId('id'), [
  body('status').isIn(['approved', 'rejected', 'pending']).withMessage('Estado inválido'),
  body('reviewNote').optional({ checkFalsy: true }).trim().isLength({ max: 300 }).withMessage('Nota demasiado larga'),
  handleValidationErrors
], async (req, res) => {
  try {
    const update = {
      status: req.body.status,
      reviewNote: sanitizeText(req.body.reviewNote, 300) || undefined,
      reviewedBy: req.user._id,
      reviewedAt: new Date()
    };

    const submission = await ResourceSubmission.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    return res.json({
      success: true,
      submission: toResourceDTO(submission)
    });
  } catch (error) {
    logger.error('Failed to update professional resource submission status', {
      route: '/api/professional-resources/submissions/:id',
      userId: req.user?._id?.toString?.() || null,
      ip: getClientIp(req),
      error: error.message
    });
    return res.status(500).json({
      success: false,
      message: 'No se pudo actualizar la solicitud.'
    });
  }
});

module.exports = router;
