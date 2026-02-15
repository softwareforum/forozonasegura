const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para verificar token JWT
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No autorizado. Por favor inicia sesión.' 
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Usuario no encontrado.' 
        });
      }

      if (req.user.isBanned) {
        return res.status(403).json({ 
          success: false, 
          message: 'Tu cuenta ha sido suspendida: ' + req.user.banReason 
        });
      }

      if (req.user.isVerified === false) {
        return res.status(403).json({
          success: false,
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Debes verificar tu email antes de acceder.'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido o expirado.' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error en la autenticación.' 
    });
  }
};

// Middleware para verificar roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para realizar esta acción.' 
      });
    }
    next();
  };
};

