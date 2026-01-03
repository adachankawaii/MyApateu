// src/application/api/controllers/ResidentController.js
const { pool } = require('../../../infrastructure/db/dbConnector');
const { requireAuth } = require('../../middleware/RequireAuthMiddleware');
const { likeParam, isDateLike, toNum } = require('../../../domain/shared/DomainUtils');

module.exports = function ResidentController(router) {
  router.get('/api/rooms', async (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      const room_type = (req.query.room_type || '').trim();
      const min_fee = toNum(req.query.min_fee);
      const max_fee = toNum(req.query.max_fee);

      let sql = `
        SELECT r.*,
          COALESCE(cnt.person_count, 0) AS person_count
        FROM rooms r
        LEFT JOIN (
          SELECT room_id, COUNT(*) AS person_count
          FROM persons
          GROUP BY room_id
        ) cnt ON cnt.room_id = r.id
        WHERE 1=1
      `;
      const params = [];

      if (q) {
        sql += ' AND (r.room_no LIKE ? OR r.room_type LIKE ?)';
        params.push(likeParam(q), likeParam(q));
      }
      if (room_type) {
        sql += ' AND r.room_type = ?';
        params.push(room_type);
      }
      if (min_fee !== null) {
        sql += ' AND COALESCE(r.monthly_fee, 0) >= ?';
        params.push(min_fee);
      }
      if (max_fee !== null) {
        sql += ' AND COALESCE(r.monthly_fee, 0) <= ?';
        params.push(max_fee);
      }

      sql += ' ORDER BY r.id DESC';

      const [rows] = await pool.query(sql, params);
      res.json({ ok: true, rooms: rows });
    } catch (e) {
      console.error('GET /api/rooms', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.get('/api/rooms/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [rows] = await pool.query(
        `SELECT r.*,
          COALESCE(cnt.person_count, 0) AS person_count
        FROM rooms r
        LEFT JOIN (
          SELECT room_id, COUNT(*) AS person_count
          FROM persons
          GROUP BY room_id
        ) cnt ON cnt.room_id = r.id
        WHERE r.id = ?
        LIMIT 1`,
        [id]
      );

      const room = rows[0];
      if (!room) return res.status(404).json({ ok: false, message: 'Room not found' });
      res.json({ ok: true, room });
    } catch (e) {
      console.error('GET /api/rooms/:id', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.post('/api/rooms', requireAuth, async (req, res) => {
    try {
      const { room_no, room_type, monthly_fee } = req.body || {};
      if (!room_no) return res.status(400).json({ ok: false, message: 'room_no is required' });

      const fee = monthly_fee === undefined || monthly_fee === null || monthly_fee === ''
        ? null
        : Number(monthly_fee);

      if (monthly_fee !== undefined && monthly_fee !== null && monthly_fee !== '' && !Number.isFinite(fee)) {
        return res.status(400).json({ ok: false, message: 'monthly_fee must be a number' });
      }

      const [r] = await pool.execute(
        'INSERT INTO rooms (room_no, room_type, monthly_fee) VALUES (?, ?, ?)',
        [String(room_no).trim(), room_type ? String(room_type).trim() : null, fee]
      );

      const [rows] = await pool.query('SELECT * FROM rooms WHERE id = ? LIMIT 1', [r.insertId]);
      res.status(201).json({ ok: true, room: rows[0] });
    } catch (e) {
      console.error('POST /api/rooms', e);
      if (e && e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ ok: false, message: 'room_no already exists' });
      }
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.put('/api/rooms/:id', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { room_no, room_type, monthly_fee } = req.body || {};

      const fields = [];
      const params = [];

      if (room_no !== undefined) {
        fields.push('room_no = ?');
        params.push(String(room_no).trim());
      }
      if (room_type !== undefined) {
        fields.push('room_type = ?');
        params.push(room_type ? String(room_type).trim() : null);
      }
      if (monthly_fee !== undefined) {
        const fee = monthly_fee === null || monthly_fee === '' ? null : Number(monthly_fee);
        if (monthly_fee !== null && monthly_fee !== '' && !Number.isFinite(fee)) {
          return res.status(400).json({ ok: false, message: 'monthly_fee must be a number' });
        }
        fields.push('monthly_fee = ?');
        params.push(fee);
      }

      if (!fields.length) {
        return res.status(400).json({ ok: false, message: 'Không có trường nào để cập nhật' });
      }

      params.push(id);

      const [r] = await pool.execute(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`, params);
      if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: 'Room not found' });

      const [rows] = await pool.query('SELECT * FROM rooms WHERE id = ? LIMIT 1', [id]);
      res.json({ ok: true, room: rows[0] });
    } catch (e) {
      console.error('PUT /api/rooms/:id', e);
      if (e && e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ ok: false, message: 'room_no already exists' });
      }
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.delete('/api/rooms/:id', requireAuth, async (req, res) => {
    const conn = await pool.getConnection();
    try {
      const id = Number(req.params.id);
      await conn.beginTransaction();

      // Xóa payments -> fees -> vehicles -> users -> persons -> room (giữ logic như server.js)
      await conn.execute(
        `DELETE p
        FROM payments p
        JOIN fees f ON f.id = p.fee_id
        WHERE f.room_id = ?`,
        [id]
      );

      await conn.execute('DELETE FROM fees WHERE room_id = ?', [id]);
      await conn.execute('DELETE FROM vehicles WHERE room_id = ?', [id]);
      await conn.execute('UPDATE users SET person_id = NULL WHERE person_id IN (SELECT id FROM persons WHERE room_id = ?)', [id]);
      await conn.execute('DELETE FROM persons WHERE room_id = ?', [id]);

      const [r] = await conn.execute('DELETE FROM rooms WHERE id = ?', [id]);
      if (r.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ ok: false, message: 'Room not found' });
      }

      await conn.commit();
      res.json({ ok: true });
    } catch (e) {
      try { await conn.rollback(); } catch {}
      console.error('DELETE /api/rooms/:id', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    } finally {
      conn.release();
    }
  });

  // ===============================
  // PERSONS
  // ===============================

  router.get('/api/persons', requireAuth, async (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      const room_id = toNum(req.query.room_id);
      const birthdate = (req.query.birthdate || '').trim();

      if (!isDateLike(birthdate)) {
        return res.status(400).json({ ok: false, message: 'birthdate must be YYYY-MM-DD' });
      }

      let sql = `
        SELECT p.*, r.room_no
        FROM persons p
        LEFT JOIN rooms r ON r.id = p.room_id
        WHERE 1=1
      `;
      const params = [];

      if (q) {
        sql += ' AND (p.full_name LIKE ? OR p.phone LIKE ? OR p.email LIKE ? OR r.room_no LIKE ?)';
        const lp = likeParam(q);
        params.push(lp, lp, lp, lp);
      }
      if (room_id !== null) {
        sql += ' AND p.room_id = ?';
        params.push(room_id);
      }
      if (birthdate) {
        sql += ' AND DATE(p.birthdate) = ?';
        params.push(birthdate);
      }

      sql += ' ORDER BY p.id DESC';

      const [rows] = await pool.query(sql, params);
      res.json({ ok: true, persons: rows });
    } catch (e) {
      console.error('GET /api/persons', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.get('/api/rooms/:id/persons', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [rows] = await pool.query('SELECT * FROM persons WHERE room_id = ? ORDER BY id DESC', [id]);
      res.json({ ok: true, persons: rows });
    } catch (e) {
      console.error('GET /api/rooms/:id/persons', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.post('/api/persons', requireAuth, async (req, res) => {
    try {
      const { room_id, full_name, gender, birthdate, email, phone, id_no } = req.body || {};
      if (!room_id || !full_name) {
        return res.status(400).json({ ok: false, message: 'room_id and full_name are required' });
      }
      if (birthdate && !isDateLike(birthdate)) {
        return res.status(400).json({ ok: false, message: 'birthdate must be YYYY-MM-DD' });
      }

      const [r] = await pool.execute(
        `INSERT INTO persons (room_id, full_name, gender, birthdate, email, phone, id_no)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(room_id),
          String(full_name).trim(),
          gender ? String(gender).trim() : null,
          birthdate || null,
          email ? String(email).trim() : null,
          phone ? String(phone).trim() : null,
          id_no ? String(id_no).trim() : null
        ]
      );

      const [rows] = await pool.query('SELECT * FROM persons WHERE id = ? LIMIT 1', [r.insertId]);
      res.status(201).json({ ok: true, person: rows[0] });
    } catch (e) {
      console.error('POST /api/persons', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.put('/api/persons/:id', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { room_id, full_name, gender, birthdate, email, phone, id_no } = req.body || {};

      if (birthdate && !isDateLike(birthdate)) {
        return res.status(400).json({ ok: false, message: 'birthdate must be YYYY-MM-DD' });
      }

      const fields = [];
      const params = [];

      if (room_id !== undefined) {
        fields.push('room_id = ?');
        params.push(room_id === null || room_id === '' ? null : Number(room_id));
      }
      if (full_name !== undefined) {
        fields.push('full_name = ?');
        params.push(full_name ? String(full_name).trim() : null);
      }
      if (gender !== undefined) {
        fields.push('gender = ?');
        params.push(gender ? String(gender).trim() : null);
      }
      if (birthdate !== undefined) {
        fields.push('birthdate = ?');
        params.push(birthdate || null);
      }
      if (email !== undefined) {
        fields.push('email = ?');
        params.push(email ? String(email).trim() : null);
      }
      if (phone !== undefined) {
        fields.push('phone = ?');
        params.push(phone ? String(phone).trim() : null);
      }
      if (id_no !== undefined) {
        fields.push('id_no = ?');
        params.push(id_no ? String(id_no).trim() : null);
      }

      if (!fields.length) {
        return res.status(400).json({ ok: false, message: 'Không có trường nào để cập nhật' });
      }

      params.push(id);

      const [r] = await pool.execute(`UPDATE persons SET ${fields.join(', ')} WHERE id = ?`, params);
      if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: 'Person not found' });

      const [rows] = await pool.query('SELECT * FROM persons WHERE id = ? LIMIT 1', [id]);
      res.json({ ok: true, person: rows[0] });
    } catch (e) {
      console.error('PUT /api/persons/:id', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.post('/api/persons/bulk_delete', requireAuth, async (req, res) => {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
      if (!ids.length) return res.status(400).json({ ok: false, message: 'ids[] required' });

      const [r] = await pool.query(`DELETE FROM persons WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
      res.json({ ok: true, deleted: r.affectedRows });
    } catch (e) {
      console.error('POST /api/persons/bulk_delete', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });
};
