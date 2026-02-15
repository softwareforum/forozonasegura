const request = require('supertest');
const express = require('express');

jest.mock('../middleware/auth', () => ({
  protect: (req, _res, next) => {
    req.user = { _id: '507f1f77bcf86cd799439011', role: 'usuario' };
    next();
  }
}));

jest.mock('../models/Post', () => ({
  countDocuments: jest.fn().mockResolvedValue(0)
}));

jest.mock('../models/User', () => ({
  findById: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn()
}));

const usersRouter = require('../routes/users');
const User = require('../models/User');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  return app;
};

describe('Users visual status routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  test('PATCH /api/users/me/visual-status invalid payload returns 400', async () => {
    const res = await request(app)
      .patch('/api/users/me/visual-status')
      .send({
        statusPreset: 'custom_status',
        statusEmoji: '🙂'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  test('PATCH /api/users/me/visual-status valid payload persists and returns 200', async () => {
    const userDoc = {
      _id: '507f1f77bcf86cd799439011',
      statusPreset: 'en_silencio',
      statusEmoji: '✨',
      save: jest.fn().mockResolvedValue()
    };
    User.findById.mockResolvedValue(userDoc);

    const res = await request(app)
      .patch('/api/users/me/visual-status')
      .send({
        statusPreset: 'fluyendo',
        statusEmoji: '🌊'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.statusPreset).toBe('fluyendo');
    expect(res.body.statusEmoji).toBe('🌊');
    expect(userDoc.save).toHaveBeenCalled();
  });
});
