const request = require('supertest');
const express = require('express');

jest.mock('../middleware/auth', () => ({
  protect: (req, _res, next) => {
    req.user = { _id: '507f1f77bcf86cd799439011', role: 'usuario' };
    next();
  }
}));

jest.mock('../middleware/contentValidation', () => ({
  validateContent: (_req, _res, next) => next()
}));

jest.mock('../models/Post', () => ({
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
  create: jest.fn()
}));

jest.mock('../models/Report', () => ({
  create: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../utils/postQuality', () => ({
  recalculatePostQuality: jest.fn().mockResolvedValue(null)
}));

jest.mock('../utils/telegram', () => ({
  sendReportTelegramNotification: jest.fn().mockResolvedValue()
}));

const Post = require('../models/Post');
const postsRouter = require('../routes/posts');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/posts', postsRouter);
  return app;
};

describe('GET /api/posts ratings sort', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    Post.aggregate.mockResolvedValue([]);
    Post.countDocuments.mockResolvedValue(0);
  });

  test('sort=best uses ratings avgGlobal descending', async () => {
    const res = await request(app).get('/api/posts?sort=best');
    expect(res.status).toBe(200);

    const pipeline = Post.aggregate.mock.calls[0][0];
    const sortStage = pipeline.find((stage) => stage.$sort);
    expect(sortStage.$sort.ratingsAvgGlobalComputed).toBe(-1);
  });

  test('sort=worst uses ratings avgGlobal ascending', async () => {
    const res = await request(app).get('/api/posts?sort=worst');
    expect(res.status).toBe(200);

    const pipeline = Post.aggregate.mock.calls[0][0];
    const sortStage = pipeline.find((stage) => stage.$sort);
    expect(sortStage.$sort.ratingsAvgGlobalComputed).toBe(1);
  });
});
