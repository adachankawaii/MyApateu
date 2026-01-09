// ErrorMiddleware.js - Error Handling Middleware

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  console.error('[Error]', err);

  // Xử lý lỗi duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      ok: false,
      message: 'Dữ liệu đã tồn tại (trùng lặp)'
    });
  }

  // Xử lý lỗi foreign key
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      ok: false,
      message: 'Dữ liệu tham chiếu không tồn tại'
    });
  }

  // Xử lý lỗi syntax JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      ok: false,
      message: 'JSON không hợp lệ'
    });
  }

  // Lỗi chung
  res.status(err.status || 500).json({
    ok: false,
    message: err.message || 'Internal Server Error'
  });
}

/**
 * Async handler wrapper - bắt lỗi async và chuyển cho error middleware
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    message: `Không tìm thấy route: ${req.method} ${req.path}`
  });
}

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler
};
