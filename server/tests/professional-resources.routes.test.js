const request = require('supertest');
const express = require('express');

jest.mock('../middleware/auth', () => ({
  protect: (req, _res, next) => {
    req.user = {
      _id: '507f1f77bcf86cd799439011',
      role: req.headers['x-role'] || 'usuario',
      email: req.headers['x-email'] || 'user@test.dev'
    };
    next();
  }
}));

jest.mock('../middleware/rateLimiters', () => ({
  resourceSubmissionLimiter: (_req, _res, next) => next()
}));

jest.mock('../models/ResourceSubmission', () => ({
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

const ResourceSubmission = require('../models/ResourceSubmission');
const resourcesRouter = require('../routes/professionalResources');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/professional-resources', resourcesRouter);
  return app;
};

describe('Professional resources routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  test('POST /api/professional-resources/submissions creates pending submission', async () => {
    ResourceSubmission.create.mockResolvedValue({
      _id: '507f1f77bcf86cd799439022',
      status: 'pending'
    });

    const res = await request(app)
      .post('/api/professional-resources/submissions')
      .send({
        entityName: 'Asociacion Apoyo',
        resourceType: 'ong',
        cityProvince: 'Cordoba',
        coverage: 'provincial',
        website: 'https://example.org',
        email: 'contacto@example.org',
        description: 'Acompanamiento social y asesoramiento para situaciones de riesgo.',
        consent: true
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('pending');
    expect(ResourceSubmission.create).toHaveBeenCalledTimes(1);
  });

  test('GET /api/professional-resources/submissions requires admin role', async () => {
    const forbidden = await request(app)
      .get('/api/professional-resources/submissions');
    expect(forbidden.status).toBe(403);

    const items = [{
      _id: '507f1f77bcf86cd799439031',
      entityName: 'Clinica Centro',
      resourceType: 'clinica',
      cityProvince: 'Sevilla',
      coverage: 'local',
      description: 'Atencion sanitaria.',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      submittedBy: null,
      reviewedBy: null
    }];

    ResourceSubmission.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue(items)
            })
          })
        })
      })
    });
    ResourceSubmission.countDocuments.mockResolvedValue(1);

    const ok = await request(app)
      .get('/api/professional-resources/submissions')
      .set('x-role', 'administrador');

    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);
    expect(Array.isArray(ok.body.submissions)).toBe(true);
  });

  test('PATCH /api/professional-resources/submissions/:id approves submission', async () => {
    ResourceSubmission.findByIdAndUpdate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439041',
      entityName: 'Servicio Legal',
      resourceType: 'asesoria_legal',
      cityProvince: 'Madrid',
      coverage: 'online',
      description: 'Asesoria legal especializada.',
      status: 'approved',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const res = await request(app)
      .patch('/api/professional-resources/submissions/507f1f77bcf86cd799439041')
      .set('x-role', 'administrador')
      .send({ status: 'approved', reviewNote: 'Validado' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.submission.status).toBe('approved');
  });
});
