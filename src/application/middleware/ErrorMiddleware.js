// src/application/middleware/ErrorMiddleware.js
module.exports = function errorMiddleware(err, req, res, next) {
  console.error('[ERROR]', err);

  if (res.headersSent) return next(err);

  const status = err.statusCode || err.status || 500;
  const message = err.code || err.message || 'Server error';

  res.status(status).json({
    ok: false,
    message
  });
};
