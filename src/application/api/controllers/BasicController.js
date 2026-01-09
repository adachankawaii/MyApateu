// src/application/api/controllers/BasicController.js
const { pool } = require('../../../infrastructure/db/dbConnector');

module.exports = function BasicController(router) {
  router.get('/api/health', (_req, res) => res.json({ ok: true, service: 'bluemoon-api' })); // :contentReference[oaicite:10]{index=10}

  router.get('/api/dbcheck', async (_req, res) => {
    try {
      const [r] = await pool.query('SELECT 1 AS ok');
      res.json({ ok: true, db: r[0].ok === 1 });
    } catch (e) {
      console.error('/api/dbcheck', e);
      res.status(500).json({ ok: false, message: e.code || 'DB failed' });
    }
  }); // :contentReference[oaicite:11]{index=11}
};
