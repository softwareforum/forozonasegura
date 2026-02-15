const mongoose = require('mongoose');
const { param } = require('express-validator');

const validateObjectId = (paramName) =>
  param(paramName).custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error(`ID invalido en parametro "${paramName}"`);
    }
    return true;
  });

module.exports = {
  validateObjectId
};
