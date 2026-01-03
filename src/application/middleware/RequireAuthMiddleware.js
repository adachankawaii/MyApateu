// src/application/middleware/RequireAuthMiddleware.js
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ ok: false, message: 'Unauthorized' });
}

module.exports = { requireAuth };
