const express = require('express');
const { query, body } = require('express-validator');
const Report = require('../models/Report');
const { protect, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validateObjectId');
const { handleValidationErrors } = require('../middleware/validation');
const { updateReputation } = require('../utils/reputation');
const { recalculatePostQuality } = require('../utils/postQuality');

const router = express.Router();

router.get('/', protect, authorize('moderador', 'administrador'), [
  query('status').optional().isIn(['open', 'approved', 'archived']).withMessage('Estado invalido'),
  query('page').optional().isInt({ min: 1 }).withMessage('Pagina debe ser un numero positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite debe estar entre 1 y 100'),
  handleValidationErrors
], async (req, res) => {
  try {
    const status = req.query.status || 'open';
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find({ status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('postId', 'title author location.provincia')
        .populate('meta.userId', 'username email'),
      Report.countDocuments({ status })
    ]);

    res.json({
      success: true,
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener reportes'
    });
  }
});

router.patch('/:id', protect, authorize('moderador', 'administrador'), validateObjectId('id'), [
  body('status').isIn(['open', 'approved', 'archived']).withMessage('Estado invalido'),
  handleValidationErrors
], async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Reporte no encontrado'
      });
    }

    const previousStatus = report.status;
    report.status = req.body.status;
    await report.save();

    if (
      previousStatus !== 'approved' &&
      report.status === 'approved' &&
      report.meta?.userId
    ) {
      await updateReputation(report.meta.userId, 5, 'report_approved', {
        reportId: report._id.toString(),
        reviewerId: req.user?._id?.toString() || null
      });
    }

    await recalculatePostQuality(report.postId);

    return res.json({
      success: true,
      report
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar reporte'
    });
  }
});

module.exports = router;
