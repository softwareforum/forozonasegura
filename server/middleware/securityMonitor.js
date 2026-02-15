// server/middleware/securityMonitor.js
const sendEmail = require('../utils/email'); // si ya lo tienes
// Si no quieres email aún, puedes comentar sendEmail y la parte de alertas.

const suspiciousLog = [];
const ipState = new Map();      // ip -> { lowScoreStrikes, blockedUntil }
const bruteState = new Map();   // key(ip|email) -> { fails, firstAt, blockedUntil }

function getIp(req) {
  // si estás detrás de proxy en deploy, luego activa: app.set('trust proxy', 1)
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown';
  return ip;
}

// ---------- BLOQUEO POR IP ----------
function isIpBlocked(ip) {
  const s = ipState.get(ip);
  if (!s) return false;
  return s.blockedUntil && s.blockedUntil > Date.now();
}

function addLowScoreStrike(ip, { score, action }) {
  const now = Date.now();
  const s = ipState.get(ip) || { lowScoreStrikes: 0, blockedUntil: 0 };
  s.lowScoreStrikes += 1;

  // Ajusta a tu gusto:
  // 3 strikes por score bajo => bloquea 30 min
  if (s.lowScoreStrikes >= 3) {
    s.blockedUntil = now + 30 * 60 * 1000;
  }

  ipState.set(ip, s);

  // Log
  suspiciousLog.push({
    type: 'LOW_SCORE',
    ip,
    score,
    action,
    at: new Date().toISOString(),
    strikes: s.lowScoreStrikes,
    blockedUntil: s.blockedUntil ? new Date(s.blockedUntil).toISOString() : null,
  });
}

// Middleware: cortar si IP está bloqueada
function blockIfIpBlocked(req, res, next) {
  const ip = getIp(req);
  if (isIpBlocked(ip)) {
    return res.status(429).json({
      success: false,
      message: 'Demasiados intentos. Tu IP está temporalmente bloqueada.',
    });
  }
  next();
}

// ---------- BRUTE FORCE (login) ----------
function makeBruteKey(ip, email) {
  return `${ip}|${(email || '').toLowerCase()}`;
}

function isBruteBlocked(key) {
  const s = bruteState.get(key);
  return s?.blockedUntil && s.blockedUntil > Date.now();
}

function onLoginFail(ip, email) {
  const key = makeBruteKey(ip, email);
  const now = Date.now();
  let s = bruteState.get(key);

  // ventana de 15 min
  const WINDOW = 15 * 60 * 1000;

  if (!s || (now - s.firstAt) > WINDOW) {
    s = { fails: 0, firstAt: now, blockedUntil: 0 };
  }

  s.fails += 1;

  // 5 fallos => bloquea 20 min
  if (s.fails >= 5) {
    s.blockedUntil = now + 20 * 60 * 1000;
  }

  bruteState.set(key, s);

  suspiciousLog.push({
    type: 'BRUTE_FORCE',
    ip,
    email,
    fails: s.fails,
    at: new Date().toISOString(),
    blockedUntil: s.blockedUntil ? new Date(s.blockedUntil).toISOString() : null,
  });

  return { key, state: s };
}

async function maybeAlertBruteForce({ ip, email, fails, blockedUntil }) {
  // dispara alerta al llegar a 5 (cuando se bloquea)
  if (fails === 5) {
    console.warn('[ALERT] Brute force bloqueado', { ip, email, blockedUntil });

    // Si tienes email configurado, envía alerta
    try {
      if (sendEmail) {
        await sendEmail({
          to: process.env.SECURITY_ALERT_EMAIL || process.env.EMAIL_USER,
          subject: '🚨 ALERTA: Brute force bloqueado (FOROTS)',
          html: `
            <h2>Brute force detectado</h2>
            <p><b>IP:</b> ${ip}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Bloqueado hasta:</b> ${blockedUntil ? new Date(blockedUntil).toISOString() : 'N/A'}</p>
          `
        });
      }
    } catch (e) {
      console.error('Error enviando alerta brute force:', e.message);
    }
  }
}

// Endpoint opcional para ver logs (solo admin luego)
function getSuspiciousLog() {
  return suspiciousLog.slice(-200); // últimos 200
}

module.exports = {
  getIp,
  blockIfIpBlocked,
  addLowScoreStrike,
  onLoginFail,
  isBruteBlocked,
  makeBruteKey,
  maybeAlertBruteForce,
  getSuspiciousLog,
};
