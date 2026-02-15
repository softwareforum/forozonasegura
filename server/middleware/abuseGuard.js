const SecurityLog = require('../models/SecurityLog');
const BlockedIp = require('../models/BlockedIp');
const { alertBruteForceBlock } = require('../utils/securityAlerts');
const logger = require('../utils/logger');
const { getClientIp } = require('./clientIp');

const blockedIps = new Map();
const attempts = new Map();

function isIpBlockedMemory(ip) {
  const blocked = blockedIps.get(ip);
  if (!blocked) return null;
  if (Date.now() > blocked.until) {
    blockedIps.delete(ip);
    return null;
  }
  return blocked;
}

async function isIpBlockedDb(ip) {
  return BlockedIp.findOne({ ip, until: { $gt: new Date() } }).lean();
}

async function blockIp(ip, ms, reason = 'blocked') {
  const until = new Date(Date.now() + ms);
  blockedIps.set(ip, { until: until.getTime(), reason });
  try {
    await BlockedIp.findOneAndUpdate(
      { ip },
      { ip, until, reason },
      { upsert: true, new: true }
    );
  } catch (error) {
    logger.warn('Blocked IP persisted only in memory', { ip, error: error.message });
  }
}

function bumpAttempt(key, windowMs) {
  const now = Date.now();
  let item = attempts.get(key);
  if (!item || now - item.firstAt > windowMs) {
    item = { count: 1, firstAt: now };
    attempts.set(key, item);
    return 1;
  }
  item.count += 1;
  attempts.set(key, item);
  return item.count;
}

function resetAttempts(keys = []) {
  keys.forEach((key) => attempts.delete(key));
}

function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  if (!local) return `***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

async function logSecurity(req, { ok, reason, action, meta = {} }) {
  if (process.env.NODE_ENV === 'test') return;
  try {
    await SecurityLog.create({
      ip: getClientIp(req),
      route: req.originalUrl,
      action,
      score: req.recaptcha?.score,
      email: req.body?.email,
      userId: req.user?._id || undefined,
      ok,
      reason,
      meta: {
        userAgent: req.headers['user-agent'],
        ...meta
      }
    });
  } catch (error) {
    logger.debug('SecurityLog write failed', { error: error.message });
  }
}

async function blockIfIpBlocked(req, res, next) {
  const ip = getClientIp(req);
  const mem = isIpBlockedMemory(ip);
  if (mem) {
    res.locals.securityCode = 'RATE_LIMIT';
    return res.status(429).json({ success: false, code: 'RATE_LIMIT', message: 'Demasiados intentos. Intentalo mas tarde.' });
  }

  try {
    const db = await isIpBlockedDb(ip);
    if (db) {
      res.locals.securityCode = 'RATE_LIMIT';
      return res.status(429).json({ success: false, code: 'RATE_LIMIT', message: 'Demasiados intentos. Intentalo mas tarde.' });
    }
  } catch (error) {
    logger.warn('Blocked IP DB check skipped', { error: error.message });
  }

  return next();
}

function blockIfLowScore(action, { scoreMin = 0.3, blockMs = 30 * 60 * 1000 } = {}) {
  return async (req, res, next) => {
    const score = req.recaptcha?.score;
    if (typeof score === 'number' && score < scoreMin) {
      await blockIp(getClientIp(req), blockMs, `low_score:${action}:${score}`);
      await logSecurity(req, { ok: false, reason: `low_score:${score}`, action });
      res.locals.securityCode = 'FORBIDDEN';
      return res.status(403).json({ success: false, message: 'Verificacion de seguridad fallida.' });
    }
    return next();
  };
}

function bruteForceGuard(action, { windowMs = 10 * 60 * 1000, maxFails = 8, blockMs = 60 * 60 * 1000 } = {}) {
  return (req, _res, next) => {
    const ip = getClientIp(req);
    const email = req.body?.email?.toLowerCase();
    req._bf = {
      action,
      windowMs,
      maxFails,
      blockMs,
      ip,
      email,
      keys: [
        `${action}:ip:${ip}`,
        email ? `${action}:email:${email}` : null,
        email ? `${action}:ip_email:${ip}|${email}` : null
      ].filter(Boolean)
    };
    next();
  };
}

async function onAuthFail(req, action = 'auth_fail', meta = {}) {
  const ip = getClientIp(req);
  if (!req._bf?.keys?.length) {
    await logSecurity(req, { ok: false, reason: meta?.reason || 'fail', action, meta });
    return;
  }

  const { keys, windowMs, maxFails, blockMs } = req._bf;
  const counts = {};
  keys.forEach((key) => {
    counts[key] = bumpAttempt(key, windowMs);
  });
  const worst = Math.max(...Object.values(counts));

  await logSecurity(req, {
    ok: false,
    reason: meta?.reason || 'invalid_credentials',
    action,
    meta: { ...meta, worst, counts }
  });

  logger.warn('Auth failed (counted)', { action, ip, email: maskEmail(req._bf.email), worst });

  if (worst >= maxFails) {
    await blockIp(ip, blockMs, `bruteforce:${action}:${worst}`);
    await logSecurity(req, {
      ok: false,
      reason: `blocked_bruteforce:${worst}`,
      action,
      meta: { ...meta, worst, counts }
    });

    try {
      await alertBruteForceBlock({
        to: process.env.SECURITY_ALERT_EMAIL || 'locademanicomio@gmail.com',
        action,
        ip,
        email: req._bf.email,
        worst,
        counts,
        keys,
        cooldownMs: 10 * 60 * 1000
      });
    } catch (error) {
      logger.debug('Brute force alert email failed', { error: error.message });
    }
  }
}

async function onAuthSuccess(req, action = 'auth_success', meta = {}) {
  const keys = req._bf?.keys || [];
  if (keys.length) resetAttempts(keys);
  await logSecurity(req, { ok: true, reason: 'ok', action, meta });
}

module.exports = {
  blockIfIpBlocked,
  blockIfLowScore,
  bruteForceGuard,
  onAuthFail,
  onAuthSuccess,
  getClientIp,
  blockIp,
  getAbuseGuardStatus: () => ({
    blockedIpsMemoryCount: blockedIps.size,
    attemptsMemoryCount: attempts.size
  }),
  __resetAbuseGuardForTests: () => {
    blockedIps.clear();
    attempts.clear();
  }
};
