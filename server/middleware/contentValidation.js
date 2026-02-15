// Validación de contenido para evitar teléfonos y nombres personales
const phoneRegex = /(\+34|0034|34)?[\s\-]?[6-9][\s\-]?[0-9]{2}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}/g;
const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const streetNumberRegex = /\b\d{1,4}\b/;

exports.validateContent = (req, res, next) => {
  // Solo validar calleAproximada (ubicación específica)
  // No validar provincia ni municipioZona para facilitar moderación
  const calleAproximada = req.body.location?.calleAproximada || req.body.calleAproximada || '';
  const textToCheck = calleAproximada.toLowerCase();

  // Verificar teléfonos solo en la calle
  if (textToCheck && phoneRegex.test(textToCheck)) {
    return res.status(400).json({
      success: false,
      message: 'No se permiten números de teléfono en la calle. Solo el nombre de la calle sin número.'
    });
  }

  // Verificar emails solo en la calle
  if (textToCheck && emailRegex.test(textToCheck)) {
    return res.status(400).json({
      success: false,
      message: 'No se permiten direcciones de email en la calle.'
    });
  }

  if (textToCheck && streetNumberRegex.test(textToCheck)) {
    return res.status(400).json({
      success: false,
      message: 'No se permiten direcciones exactas (numero de portal/piso). Usa solo zona aproximada.'
    });
  }
  
  next();
};


