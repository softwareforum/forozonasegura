function normalizeIp(ip) {
  if (!ip) return '';
  return String(ip).replace(/^::ffff:/, '');
}

function parseForwardedFor(headerValue) {
  if (!headerValue) return '';
  const first = String(headerValue).split(',')[0]?.trim();
  return normalizeIp(first);
}

function getClientIp(req) {
  // With `app.set('trust proxy', 1)`, req.ip is the client IP behind CDN/proxy.
  const directIp = normalizeIp(req.ip);
  if (directIp) return directIp;

  const forwardedIp = parseForwardedFor(req.headers['x-forwarded-for']);
  if (forwardedIp) return forwardedIp;

  return normalizeIp(req.socket?.remoteAddress || '');
}

module.exports = { getClientIp, normalizeIp };
