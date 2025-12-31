// ValidationMiddleware.js - Request Validation Middleware

const { isDateLike, toNum } = require('../../domain/shared/DomainUtils');

/**
 * Validate ID param
 */
function validateIdParam(paramName = 'id') {
  return (req, res, next) => {
    const id = toNum(req.params[paramName]);
    if (!id) {
      return res.status(400).json({
        ok: false,
        message: `${paramName} không hợp lệ`
      });
    }
    req.validatedId = id;
    next();
  };
}

/**
 * Validate required fields in body
 */
function validateRequired(fields = []) {
  return (req, res, next) => {
    const missing = [];
    for (const field of fields) {
      if (!req.body || !req.body[field]) {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      return res.status(400).json({
        ok: false,
        message: `Thiếu các trường bắt buộc: ${missing.join(', ')}`
      });
    }
    next();
  };
}

/**
 * Validate date fields
 */
function validateDateFields(fields = []) {
  return (req, res, next) => {
    for (const field of fields) {
      if (req.body && req.body[field] && !isDateLike(req.body[field])) {
        return res.status(400).json({
          ok: false,
          message: `${field} phải dạng YYYY-MM-DD hoặc null`
        });
      }
    }
    next();
  };
}

/**
 * Validate numeric fields are non-negative
 */
function validateNonNegative(fields = []) {
  return (req, res, next) => {
    for (const field of fields) {
      if (req.body && req.body[field] !== undefined) {
        const val = Number(req.body[field]);
        if (!Number.isFinite(val) || val < 0) {
          return res.status(400).json({
            ok: false,
            message: `${field} phải là số không âm`
          });
        }
      }
    }
    next();
  };
}

/**
 * Sanitize body - trim strings
 */
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    }
  }
  next();
}

module.exports = {
  validateIdParam,
  validateRequired,
  validateDateFields,
  validateNonNegative,
  sanitizeBody
};
