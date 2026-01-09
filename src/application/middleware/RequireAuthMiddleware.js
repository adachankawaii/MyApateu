// RequireAuthMiddleware.js - Authentication Middleware

/**
 * Middleware kiểm tra xác thực người dùng
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ ok: false, message: 'Unauthorized' });
}

/**
 * Middleware kiểm tra quyền admin
 */
function requireAdmin(req, res, next) {
  if (req.session && req.session.userId && req.session.role === 'ADMIN') {
    return next();
  }
  return res.status(403).json({ ok: false, message: 'Forbidden - Admin access required' });
}

/**
 * Middleware optional auth - không bắt buộc nhưng gắn userId vào request nếu có
 */
function optionalAuth(req, res, next) {
  if (req.session && req.session.userId) {
    req.userId = req.session.userId;
    req.userRole = req.session.role;
  }
  return next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth
};
