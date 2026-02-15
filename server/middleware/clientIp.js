function normalizeIp(ip) {
  if (!ip) return '';
  return String(ip).replace(/^::ffff:/, '');
}

function getClientIp(req) {
  return normalizeIp(req.ip || req.socket?.remoteAddress || req.headers['x-forwarded-for'] || '');
}

module.exports = { getClientIp, normalizeIp };
