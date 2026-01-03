// src/application/api/controllers/AuthController.js
const { pool } = require('../../../infrastructure/db/dbConnector');
const { requireAuth } = require('../../middleware/RequireAuthMiddleware');

module.exports = function AuthController(router) {
  router.post('/api/login', async (req, res) => {
    try {
      const username = (req.body?.username || '').trim();
      const password = req.body?.password || '';
      if (!username || !password) {
        return res.status(400).json({ ok: false, message: 'Thiếu tài khoản hoặc mật khẩu' });
      }

      const [rows] = await pool.execute(
        'SELECT id, username, password_hash, role, person_id FROM users WHERE username = ? LIMIT 1',
        [username]
      );
      const user = rows[0];

      // Lưu ý: đang so sánh plain text (giữ nguyên như server bạn) :contentReference[oaicite:12]{index=12}
      if (!user || user.password_hash !== password) {
        return res.status(401).json({ ok: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
      }

      req.session.userId = user.id;
      res.json({ ok: true, id: user.id, username: user.username, role: user.role, person_id: user.person_id });
    } catch (e) {
      console.error('/api/login', e);
      res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }); // :contentReference[oaicite:13]{index=13}

  router.post('/api/logout', (req, res) => {
    if (!req.session) return res.json({ ok: true });
    req.session.destroy(err => {
      if (err) return res.status(500).json({ ok: false, message: 'Cannot destroy session' });
      res.clearCookie('bluemoon.sid');
      return res.json({ ok: true });
    });
  }); // :contentReference[oaicite:14]{index=14}

  router.get('/api/me', requireAuth, async (req, res) => {
    try {
      const [rows] = await pool.query(
        'SELECT id, username, role, person_id FROM users WHERE id = ? LIMIT 1',
        [req.session.userId]
      );
      const me = rows[0];
      if (!me) return res.status(404).json({ ok: false, message: 'User not found' });
      res.json({ ok: true, user: me });
    } catch (e) {
      console.error('/api/me', e);
      res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  });
};
