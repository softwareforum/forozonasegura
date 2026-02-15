const request = require('supertest');
const express = require('express');

const buildApp = () => {
  const { authLimiter, meLimiter, publicLimiter } = require('../middleware/rateLimiters');
  const { bruteForceGuard, onAuthFail } = require('../middleware/abuseGuard');
  const app = express();
  app.use(express.json());
  app.post('/login', authLimiter, (_req, res) => res.json({ success: true }));
  app.get('/me', meLimiter, (_req, res) => res.json({ success: true }));
  app.get('/public', publicLimiter, (_req, res) => res.json({ success: true }));
  app.post('/bf-login', authLimiter, bruteForceGuard('login'), async (req, res) => {
    if (req.body.password !== 'ok') {
      await onAuthFail(req, 'login_invalid_credentials', { reason: 'invalid_credentials' });
      return res.status(401).json({ success: false });
    }
    return res.json({ success: true });
  });
  return app;
};

describe('Security rate limit policy', () => {
  let app;
  const AUTH_MAX = 5;
  const PUBLIC_MAX = 15;
  const ME_MAX = 50;

  beforeEach(() => {
    process.env.RATE_WINDOW_MS = '900000';
    process.env.RATE_AUTH_MAX = String(AUTH_MAX);
    process.env.RATE_PUBLIC_MAX = String(PUBLIC_MAX);
    process.env.RATE_ME_MAX = String(ME_MAX);
    process.env.RATE_PASSWORD_MAX = '4';
    jest.resetModules();
    app = buildApp();
    const { __resetAbuseGuardForTests } = require('../middleware/abuseGuard');
    __resetAbuseGuardForTests();
  });

  test('login endpoint is strictly rate limited', async () => {
    for (let i = 0; i < AUTH_MAX; i += 1) {
      const ok = await request(app).post('/login').send({ email: 'a@a.com', password: 'x' });
      expect(ok.status).toBe(200);
    }
    const limited = await request(app).post('/login').send({ email: 'a@a.com', password: 'x' });
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe('RATE_LIMIT');
    expect(typeof limited.body.retryAfterSeconds).toBe('number');
    expect(Number.parseInt(limited.headers['retry-after'], 10)).toBeGreaterThan(0);
  });

  test('/me endpoint is not aggressively rate limited', async () => {
    for (let i = 0; i < 30; i += 1) {
      const res = await request(app).get('/me');
      expect(res.status).toBe(200);
    }
  });

  test('public limiter emits 429 (not 401) when limit exceeded', async () => {
    for (let i = 0; i < PUBLIC_MAX; i += 1) {
      const ok = await request(app).get('/public');
      expect(ok.status).toBe(200);
    }
    const limited = await request(app).get('/public');
    expect(limited.status).toBe(429);
    expect(limited.status).not.toBe(401);
    expect(limited.body.code).toBe('RATE_LIMIT');
  });

  test('brute-force counter increases on 401 but not on 429', async () => {
    const { getAbuseGuardStatus } = require('../middleware/abuseGuard');

    for (let i = 0; i < AUTH_MAX; i += 1) {
      const res = await request(app).post('/bf-login').send({ email: 'a@a.com', password: 'bad' });
      expect(res.status).toBe(401);
    }
    const beforeRateLimited = getAbuseGuardStatus().attemptsMemoryCount;
    const limited = await request(app).post('/bf-login').send({ email: 'a@a.com', password: 'bad' });
    expect(limited.status).toBe(429);
    const afterRateLimited = getAbuseGuardStatus().attemptsMemoryCount;
    expect(afterRateLimited).toBe(beforeRateLimited);
  });
});
