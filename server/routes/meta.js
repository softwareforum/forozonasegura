const express = require('express');
const { comunidadesAutonomas } = require('../constants/spainTerritory');

const router = express.Router();

router.get('/territory', (_req, res) => {
  res.json({
    success: true,
    comunidadesAutonomas
  });
});

module.exports = router;
