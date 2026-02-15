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
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
  create: jest.fn()
}));

jest.mock('../models/Report', () => ({
  create: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../utils/telegram', () => ({
  sendReportTelegramNotification: jest.fn().mockResolvedValue()
}));

jest.mock('../utils/postQuality', () => ({
  recalculatePostQuality: jest.fn().mockResolvedValue(null)
}));

const Post = require('../models/Post');
const Report = require('../models/Report');
const User = require('../models/User');
const postsRouter = require('../routes/posts');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/posts', postsRouter);
  return app;
};

const validObjectId = '507f1f77bcf86cd799439011';

describe('Posts routes validation and compatibility', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  test('GET /api/posts with invalid query returns 400', async () => {
    const res = await request(app).get('/api/posts?category=invalid');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/posts missing required fields returns 400', async () => {
    const res = await request(app).post('/api/posts').send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/posts creates post with canonical payload', async () => {
    const createdPost = { _id: '507f1f77bcf86cd799439012', save: jest.fn().mockResolvedValue() };
    const populatedPost = { _id: createdPost._id, title: 'Calle, Ciudad' };
    const userDoc = {
      reputation: 0,
      calculateLevel: jest.fn().mockReturnValue(1),
      save: jest.fn().mockResolvedValue()
    };

    Post.create.mockResolvedValue(createdPost);
    Post.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(populatedPost)
    });
    User.findById.mockResolvedValue(userDoc);

    const res = await request(app).post('/api/posts').send({
      title: 'Calle, Ciudad',
      tipoEspacio: 'piso_independiente',
      location: {
        provincia: 'Madrid',
        geo: {
          center: {
            type: 'Point',
            coordinates: [-3.7038, 40.4168]
          },
          radiusMeters: 600
        }
      },
      servicios: { cocinaDigna: true, banoDigno: true },
      checkInOut: 'Llegada despues de las 15:00 y salida antes de las 12:00',
      depositRequired: false,
      cleaningFrequency: '1 vez por semana'
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(Post.create).toHaveBeenCalledTimes(1);
  });

  test('POST /api/posts/:id/replies with invalid service returns 400', async () => {
    const res = await request(app)
      .post(`/api/posts/${validObjectId}/replies`)
      .send({
        servicios: { servicioInvalido: true },
        checkInOut: 'Llegada despues de las 15:00 y salida antes de las 12:00',
        depositRequired: true,
        cleaningFrequency: 'Nunca'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/posts/:id/replies creates reply and accepts legacy keys', async () => {
    const postDoc = {
      _id: validObjectId,
      isDeleted: false,
      isLocked: false,
      replies: [],
      save: jest.fn().mockResolvedValue()
    };
    const populatedPost = {
      _id: validObjectId,
      replies: [{ _id: 'reply1', servicios: { banoDigno: true } }]
    };
    const queryChain = {
      replies: populatedPost.replies,
      populate: jest.fn().mockReturnThis()
    };
    const userDoc = {
      reputation: 0,
      calculateLevel: jest.fn().mockReturnValue(1),
      save: jest.fn().mockResolvedValue()
    };

    Post.findById
      .mockResolvedValueOnce(postDoc)
      .mockReturnValueOnce(queryChain);
    User.findById.mockResolvedValue(userDoc);

    const res = await request(app)
      .post(`/api/posts/${validObjectId}/replies`)
      .send({
        servicios: { ['bañoDigno']: true },
        checkInOut: 'Llegada después de las 15:00 y salida antes de las 12:00',
        depositRequired: false,
        cleaningFrequency: '2 o más veces por semana'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(postDoc.replies.length).toBe(1);
  });

  test('POST /api/posts/:id/vote with invalid type returns 400', async () => {
    const res = await request(app)
      .post(`/api/posts/${validObjectId}/vote`)
      .send({ type: 'invalid_vote' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/posts/:id/vote recalculates quality score', async () => {
    const postDoc = {
      _id: validObjectId,
      isDeleted: false,
      author: validObjectId,
      votes: {
        upvotes: [],
        downvotes: []
      },
      save: jest.fn().mockResolvedValue()
    };
    Post.findById.mockResolvedValue(postDoc);

    const res = await request(app)
      .post(`/api/posts/${validObjectId}/vote`)
      .send({ type: 'upvote' });

    expect(res.status).toBe(200);
    expect(postDoc.save).toHaveBeenCalled();
  });

  test('POST /api/posts/:id/report with empty reason returns 400', async () => {
    Post.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: validObjectId, isDeleted: false, zonaSegura: true, save: jest.fn() })
    });
    Report.countDocuments.mockResolvedValue(0);
    const res = await request(app)
      .post(`/api/posts/${validObjectId}/report`)
      .send({ message: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
