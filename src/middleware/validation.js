const { validationResult } = require('express-validator');
const { createValidationErrorResponse } = require('../utils/errorHandler');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json(
      createValidationErrorResponse(errors.array(), req.originalUrl)
    );
  }
  
  next();
};

module.exports = {
  handleValidationErrors
}; 