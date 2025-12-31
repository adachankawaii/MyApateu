// AuthController.js - Authentication Controller

const IController = require('./IController');
const authService = require('../../../domain/service/AuthService');

class AuthController extends IController {
  /**
   * POST /api/login
   */
  async login(req, res) {
    try {
      const { username, password } = req.body || {};
      const result = await authService.authenticate(username, password);

      if (!result.success) {
        return res.status(401).json({ ok: false, message: result.message });
      }

      // Lưu session
      req.session.userId = result.user.id;
      req.session.role = result.user.role;

      return res.json({
        ok: true,
        id: result.user.id,
        username: result.user.username,
        role: result.user.role,
        person_id: result.user.person_id
      });
    } catch (e) {
      console.error('/api/login', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * POST /api/logout
   */
  async logout(req, res) {
    if (!req.session) return res.json({ ok: true });

    req.session.destroy(err => {
      if (err) return res.status(500).json({ ok: false, message: 'Cannot destroy session' });
      res.clearCookie('bluemoon.sid');
      res.json({ ok: true });
    });
  }

  /**
   * GET /api/me
   */
  async me(req, res) {
    try {
      const userId = Number(req.session.userId);
      const user = await authService.getCurrentUser(userId);

      if (!user) {
        return res.status(404).json({ ok: false, message: 'User not found' });
      }

      return res.json({ ok: true, user });
    } catch (e) {
      console.error('/api/me', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * GET /api/building
   */
  getBuildingInfo(req, res) {
    const info = authService.getBuildingInfo();
    return res.json(info);
  }
}

module.exports = new AuthController();
