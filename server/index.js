// Cargar variables de entorno PRIMERO
require('dotenv').config({ path: `${__dirname}/.env` });

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const BlockedIp = require('./models/BlockedIp');
const logger = require('./utils/logger');
const { securityRequestLogger } = require('./middleware/securityRequestLogger');
const { publicLimiter, getOnly, getRateLimiterStatus } = require('./middleware/rateLimiters');

const app = express();
const trustProxy = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true';
if (trustProxy) {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(securityRequestLogger);
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  logger.error('MONGODB_URI not configured');
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => {
    logger.info('MongoDB connected', { db: mongoURI.split('/').pop() });
  })
  .catch((err) => {
    logger.error('MongoDB connection error', { error: err.message });
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB runtime error', { error: err.message });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', getOnly(publicLimiter), require('./routes/posts'));
app.use('/api/activity', getOnly(publicLimiter), require('./routes/activity'));
app.use('/api/communities', getOnly(publicLimiter), require('./routes/communities'));
app.use('/api/meta', getOnly(publicLimiter), require('./routes/meta'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/professional-resources', getOnly(publicLimiter), require('./routes/professionalResources'));
app.use('/api/moderation', require('./routes/moderation'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'Foro Zona Segura API' });
});

if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_ENDPOINTS === 'true') {
  app.get('/api/debug/security-status', async (_req, res) => {
    const blockedIpsCount = await BlockedIp.countDocuments({ until: { $gt: new Date() } });
    res.json({
      success: true,
      rateLimit: getRateLimiterStatus(),
      blockedIpsCount
    });
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info('Server started', { port: PORT, env: process.env.NODE_ENV || 'development' });
});
