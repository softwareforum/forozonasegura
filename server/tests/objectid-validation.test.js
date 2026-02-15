const request = require('supertest');
const express = require('express');

jest.mock('../middleware/auth', () => ({
  protect: (req, _res, next) => {
    req.user = { _id: '507f1f77bcf86cd799439011', role: 'administrador' };
    next();
  },
  authorize: () => (_req, _res, next) => next()
}));

jest.mock('../models/Post', () => ({
  findById: jest.fn()
}));

jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/ModerationLog', () => ({
  create: jest.fn()
}));

jest.mock('../models/Community', () => ({}));

const usersRouter = require('../routes/users');
const moderationRouter = require('../routes/moderation');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  app.use('/api/moderation', moderationRouter);
  return app;
};

describe('ObjectId validation in users and moderation routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  test('GET /api/users/:id/posts invalid id returns 400', async () => {
    const res = await request(app).get('/api/users/not-an-object-id/posts');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('DELETE /api/moderation/posts/:id invalid id returns 400', async () => {
    const res = await request(app).delete('/api/moderation/posts/not-an-object-id');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
