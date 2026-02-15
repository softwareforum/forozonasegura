const express = require('express');
const Community = require('../models/Community');
const Post = require('../models/Post');

const router = express.Router();

// @route   GET /api/communities
// @desc    Obtener todas las comunidades autónomas
// @access  Public
router.get('/', async (req, res) => {
  try {
    const communities = await Community.find().sort({ name: 1 });
    res.json({
      success: true,
      communities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener comunidades'
    });
  }
});

// @route   GET /api/communities/:slug
// @desc    Obtener una comunidad específica con sus ciudades
// @access  Public
router.get('/:slug', async (req, res) => {
  try {
    const community = await Community.findOne({ slug: req.params.slug });
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Comunidad no encontrada'
      });
    }

    res.json({
      success: true,
      community
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener comunidad'
    });
  }
});

// @route   GET /api/communities/:slug/:citySlug/stats
// @desc    Obtener estadísticas de una ciudad
// @access  Public
router.get('/:slug/:citySlug/stats', async (req, res) => {
  try {
    const community = await Community.findOne({ slug: req.params.slug });
    
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Comunidad no encontrada'
      });
    }

    const city = community.cities.find(c => c.slug === req.params.citySlug);
    
    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'Ciudad no encontrada'
      });
    }

    const stats = {
      pisos: await Post.countDocuments({ 
        community: community.name, 
        city: city.name, 
        category: 'piso',
        isDeleted: false 
      }),
      plazas: await Post.countDocuments({ 
        community: community.name, 
        city: city.name, 
        category: 'plaza',
        isDeleted: false 
      }),
      clubes: await Post.countDocuments({ 
        community: community.name, 
        city: city.name, 
        category: 'club',
        isDeleted: false 
      })
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
});

module.exports = router;

