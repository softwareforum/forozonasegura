const logger = require('../utils/logger');
const { getClientIp } = require('./clientIp');

const securityRequestLogger = (req, res, next) => {
  res.on('finish', () => {
    if (![401, 403, 429].includes(res.statusCode)) return;
    const codeMap = {
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      429: 'RATE_LIMIT'
    };
    logger.warn('Security response emitted', {
      statusCode: res.statusCode,
      route: req.originalUrl,
      method: req.method,
      ip: getClientIp(req),
      userId: req.user?._id?.toString?.() || null,
      code: res.locals.securityCode || codeMap[res.statusCode]
    });
  });
  next();
};

module.exports = { securityRequestLogger };
