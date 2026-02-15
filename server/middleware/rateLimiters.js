const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const { getClientIp } = require('./clientIp');

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const RATE_WINDOW_MS = toInt(process.env.RATE_WINDOW_MS, 15 * 60 * 1000);
const RATE_PUBLIC_MAX = toInt(process.env.RATE_PUBLIC_MAX, 300);
const RATE_AUTH_MAX = toInt(process.env.RATE_AUTH_MAX, 20);
const RATE_PASSWORD_MAX = toInt(process.env.RATE_PASSWORD_MAX, 10);
const RATE_ME_MAX = toInt(process.env.RATE_ME_MAX, 300);
const RATE_REPORT_MAX = toInt(process.env.RATE_REPORT_MAX, 10);
const RATE_RESOURCE_SUBMISSION_MAX = toInt(process.env.RATE_RESOURCE_SUBMISSION_MAX, 12);
const RATE_FOLLOW_MAX = toInt(process.env.RATE_FOLLOW_MAX, 60);

const rateMetrics = {
  hits: [],
  byLimiter: {
    public: 0,
    auth: 0,
    password: 0,
    me: 0,
    report: 0,
    resource_submission: 0,
    follow: 0
  }
};

const pushRateHit = ({ limiter, req }) => {
  const hit = {
    limiter,
    at: Date.now(),
    route: req.originalUrl,
    method: req.method,
    ip: getClientIp(req)
  };
  rateMetrics.hits.push(hit);
  if (rateMetrics.hits.length > 1000) {
    rateMetrics.hits.splice(0, rateMetrics.hits.length - 1000);
  }
  rateMetrics.byLimiter[limiter] = (rateMetrics.byLimiter[limiter] || 0) + 1;
};

const buildLimiter = ({
  key,
  windowMs,
  max,
  message
}) => rateLimit({
  windowMs,
  max,
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    pushRateHit({ limiter: key, req });
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(((req.rateLimit?.resetTime?.getTime?.() || (Date.now() + windowMs)) - Date.now()) / 1000)
    );
    res.set('Retry-After', String(retryAfterSeconds));
    res.locals.securityCode = 'RATE_LIMIT';
    logger.warn('Rate limit exceeded', {
      limiter: key,
      route: req.originalUrl,
      method: req.method,
      ip: getClientIp(req),
      userId: req.user?._id?.toString?.() || null
    });
    res.status(429).json({
      success: false,
      code: 'RATE_LIMIT',
      message,
      retryAfterSeconds
    });
  }
});

const publicLimiter = buildLimiter({
  key: 'public',
  windowMs: RATE_WINDOW_MS,
  max: RATE_PUBLIC_MAX,
  message: 'Demasiadas peticiones de lectura. Espera unos segundos.'
});

const authLimiter = buildLimiter({
  key: 'auth',
  windowMs: RATE_WINDOW_MS,
  max: RATE_AUTH_MAX,
  message: 'Demasiados intentos de autenticación. Inténtalo más tarde.'
});

const passwordLimiter = buildLimiter({
  key: 'password',
  windowMs: RATE_WINDOW_MS,
  max: RATE_PASSWORD_MAX,
  message: 'Demasiados intentos de recuperación de contraseña. Inténtalo más tarde.'
});

const meLimiter = buildLimiter({
  key: 'me',
  windowMs: RATE_WINDOW_MS,
  max: RATE_ME_MAX,
  message: 'Has realizado demasiadas acciones. Espera unos segundos.'
});

const reportLimiter = buildLimiter({
  key: 'report',
  windowMs: RATE_WINDOW_MS,
  max: RATE_REPORT_MAX,
  message: 'Demasiados reportes en poco tiempo. Espera unos minutos.'
});

const resourceSubmissionLimiter = buildLimiter({
  key: 'resource_submission',
  windowMs: RATE_WINDOW_MS,
  max: RATE_RESOURCE_SUBMISSION_MAX,
  message: 'Demasiadas solicitudes de recurso en poco tiempo. Espera unos minutos.'
});

const followLimiter = buildLimiter({
  key: 'follow',
  windowMs: RATE_WINDOW_MS,
  max: RATE_FOLLOW_MAX,
  message: 'Demasiadas acciones de seguimiento. Espera unos segundos.'
});

const getOnly = (limiter) => (req, res, next) => {
  if (req.method !== 'GET') return next();
  return limiter(req, res, next);
};

const getRateLimiterStatus = (windowMs = 15 * 60 * 1000) => {
  const from = Date.now() - windowMs;
  const recentHits = rateMetrics.hits.filter((hit) => hit.at >= from);
  return {
    windowMs,
    totalRecentHits: recentHits.length,
    byLimiterRecent: recentHits.reduce((acc, hit) => {
      acc[hit.limiter] = (acc[hit.limiter] || 0) + 1;
      return acc;
    }, {}),
    byLimiterTotal: { ...rateMetrics.byLimiter },
    config: {
      RATE_WINDOW_MS,
      RATE_PUBLIC_MAX,
      RATE_AUTH_MAX,
      RATE_PASSWORD_MAX,
      RATE_ME_MAX,
      RATE_REPORT_MAX,
      RATE_RESOURCE_SUBMISSION_MAX,
      RATE_FOLLOW_MAX
    }
  };
};

module.exports = {
  publicLimiter,
  authLimiter,
  passwordLimiter,
  meLimiter,
  reportLimiter,
  resourceSubmissionLimiter,
  followLimiter,
  getOnly,
  getRateLimiterStatus
};
