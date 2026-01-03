// src/application/api/controllers/BillingController.js
const { pool } = require('../../../infrastructure/db/dbConnector');
const { requireAuth } = require('../../middleware/RequireAuthMiddleware');
const { likeParam, isDateLike, toNum } = require('../../../domain/shared/DomainUtils');

module.exports = function BillingController(router) {
  // ========================================
  // FEES
  // ========================================

  router.get('/api/fees', requireAuth, async (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      const status = (req.query.status || '').trim();
      const fee_type = (req.query.fee_type || '').trim();
      const room_id = toNum(req.query.room_id);
      const vehicle_id = toNum(req.query.vehicle_id);

      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || '10', 10)));
      const offset = (page - 1) * pageSize;

      let where = 'WHERE 1=1';
      const params = [];

      if (q) {
        where += ' AND (f.title LIKE ? OR f.note LIKE ? OR r.room_no LIKE ?)';
        const lp = likeParam(q);
        params.push(lp, lp, lp);
      }
      if (status) {
        where += ' AND f.status = ?';
        params.push(status);
      }
      if (fee_type) {
        where += ' AND f.fee_type = ?';
        params.push(fee_type);
      }
      if (room_id !== null) {
        where += ' AND f.room_id = ?';
        params.push(room_id);
      }
      if (vehicle_id !== null) {
        where += ' AND f.vehicle_id = ?';
        params.push(vehicle_id);
      }

      const [countRows] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM fees f
        LEFT JOIN rooms r ON r.id = f.room_id
        ${where}
        `,
        params
      );
      const total = countRows[0]?.total || 0;

      const [rows] = await pool.query(
        `
        SELECT f.*, r.room_no, v.plate_no
        FROM fees f
        LEFT JOIN rooms r ON r.id = f.room_id
        LEFT JOIN vehicles v ON v.id = f.vehicle_id
        ${where}
        ORDER BY f.id DESC
        LIMIT ? OFFSET ?
        `,
        [...params, pageSize, offset]
      );

      res.json({ ok: true, total, page, pageSize, fees: rows });
    } catch (e) {
      console.error('GET /api/fees', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.get('/api/fees/:id', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [rows] = await pool.query(
        `
        SELECT f.*, r.room_no, v.plate_no
        FROM fees f
        LEFT JOIN rooms r ON r.id = f.room_id
        LEFT JOIN vehicles v ON v.id = f.vehicle_id
        WHERE f.id = ?
        LIMIT 1
        `,
        [id]
      );
      const fee = rows[0];
      if (!fee) return res.status(404).json({ ok: false, message: 'Fee not found' });
      res.json({ ok: true, fee });
    } catch (e) {
      console.error('GET /api/fees/:id', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.post('/api/fees', requireAuth, async (req, res) => {
    try {
      const { title, fee_type, amount, status, due_date, note, room_id, vehicle_id } = req.body || {};

      if (!title || amount === undefined || amount === null) {
        return res.status(400).json({ ok: false, message: 'title and amount are required' });
      }
      const amt = Number(amount);
      if (!Number.isFinite(amt)) return res.status(400).json({ ok: false, message: 'amount must be a number' });

      if (due_date && !isDateLike(due_date)) {
        return res.status(400).json({ ok: false, message: 'due_date must be YYYY-MM-DD' });
      }

      const [r] = await pool.execute(
        `INSERT INTO fees (title, fee_type, amount, status, due_date, note, room_id, vehicle_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(title).trim(),
          fee_type ? String(fee_type).trim() : null,
          amt,
          status ? String(status).trim() : 'UNPAID',
          due_date || null,
          note ? String(note).trim() : null,
          room_id ? Number(room_id) : null,
          vehicle_id ? Number(vehicle_id) : null
        ]
      );

      const [rows] = await pool.query('SELECT * FROM fees WHERE id = ? LIMIT 1', [r.insertId]);
      res.status(201).json({ ok: true, fee: rows[0] });
    } catch (e) {
      console.error('POST /api/fees', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.put('/api/fees/:id', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { title, fee_type, amount, status, due_date, note, room_id, vehicle_id } = req.body || {};

      if (due_date && !isDateLike(due_date)) {
        return res.status(400).json({ ok: false, message: 'due_date must be YYYY-MM-DD' });
      }

      const fields = [];
      const params = [];

      if (title !== undefined) {
        fields.push('title = ?');
        params.push(title ? String(title).trim() : null);
      }
      if (fee_type !== undefined) {
        fields.push('fee_type = ?');
        params.push(fee_type ? String(fee_type).trim() : null);
      }
      if (amount !== undefined) {
        const amt = amount === null || amount === '' ? null : Number(amount);
        if (amt !== null && !Number.isFinite(amt)) {
          return res.status(400).json({ ok: false, message: 'amount must be a number' });
        }
        fields.push('amount = ?');
        params.push(amt);
      }
      if (status !== undefined) {
        fields.push('status = ?');
        params.push(status ? String(status).trim() : null);
      }
      if (due_date !== undefined) {
        fields.push('due_date = ?');
        params.push(due_date || null);
      }
      if (note !== undefined) {
        fields.push('note = ?');
        params.push(note ? String(note).trim() : null);
      }
      if (room_id !== undefined) {
        fields.push('room_id = ?');
        params.push(room_id === null || room_id === '' ? null : Number(room_id));
      }
      if (vehicle_id !== undefined) {
        fields.push('vehicle_id = ?');
        params.push(vehicle_id === null || vehicle_id === '' ? null : Number(vehicle_id));
      }

      if (!fields.length) {
        return res.status(400).json({ ok: false, message: 'Không có trường nào để cập nhật' });
      }

      params.push(id);

      const [r] = await pool.execute(`UPDATE fees SET ${fields.join(', ')} WHERE id = ?`, params);
      if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: 'Fee not found' });

      const [rows] = await pool.query('SELECT * FROM fees WHERE id = ? LIMIT 1', [id]);
      res.json({ ok: true, fee: rows[0] });
    } catch (e) {
      console.error('PUT /api/fees/:id', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.delete('/api/fees/:id', requireAuth, async (req, res) => {
    const conn = await pool.getConnection();
    try {
      const id = Number(req.params.id);
      await conn.beginTransaction();

      await conn.execute('DELETE FROM payments WHERE fee_id = ?', [id]);

      const [r] = await conn.execute('DELETE FROM fees WHERE id = ?', [id]);
      if (r.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ ok: false, message: 'Fee not found' });
      }

      await conn.commit();
      res.json({ ok: true });
    } catch (e) {
      try { await conn.rollback(); } catch {}
      console.error('DELETE /api/fees/:id', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    } finally {
      conn.release();
    }
  });

  // ========================================
  // PAYMENTS
  // ========================================

  router.get('/api/payments', requireAuth, async (req, res) => {
    try {
      const fee_id = toNum(req.query.fee_id);
      const room_id = toNum(req.query.room_id);
      const from_date = (req.query.from_date || '').trim();
      const to_date = (req.query.to_date || '').trim();

      if (from_date && !isDateLike(from_date)) return res.status(400).json({ ok: false, message: 'from_date must be YYYY-MM-DD' });
      if (to_date && !isDateLike(to_date)) return res.status(400).json({ ok: false, message: 'to_date must be YYYY-MM-DD' });

      let sql = `
        SELECT p.*, f.title AS fee_title, r.room_no
        FROM payments p
        JOIN fees f ON f.id = p.fee_id
        LEFT JOIN rooms r ON r.id = f.room_id
        WHERE 1=1
      `;
      const params = [];

      if (fee_id !== null) {
        sql += ' AND p.fee_id = ?';
        params.push(fee_id);
      }
      if (room_id !== null) {
        sql += ' AND f.room_id = ?';
        params.push(room_id);
      }
      if (from_date) {
        sql += ' AND DATE(p.paid_at) >= ?';
        params.push(from_date);
      }
      if (to_date) {
        sql += ' AND DATE(p.paid_at) <= ?';
        params.push(to_date);
      }

      sql += ' ORDER BY p.id DESC';

      const [rows] = await pool.query(sql, params);
      res.json({ ok: true, payments: rows });
    } catch (e) {
      console.error('GET /api/payments', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.post('/api/payments', requireAuth, async (req, res) => {
    const conn = await pool.getConnection();
    try {
      const { fee_id, amount, paid_at, method, note } = req.body || {};
      if (!fee_id || amount === undefined || amount === null) {
        return res.status(400).json({ ok: false, message: 'fee_id and amount are required' });
      }
      const amt = Number(amount);
      if (!Number.isFinite(amt)) return res.status(400).json({ ok: false, message: 'amount must be a number' });
      if (paid_at && !isDateLike(paid_at)) return res.status(400).json({ ok: false, message: 'paid_at must be YYYY-MM-DD' });

      await conn.beginTransaction();

      // create payment
      const [r] = await conn.execute(
        `INSERT INTO payments (fee_id, amount, paid_at, method, note)
         VALUES (?, ?, ?, ?, ?)`,
        [
          Number(fee_id),
          amt,
          paid_at ? paid_at : new Date(),
          method ? String(method).trim() : null,
          note ? String(note).trim() : null
        ]
      );

      // mark fee as PAID (logic giữ như server.js)
      await conn.execute(`UPDATE fees SET status = 'PAID' WHERE id = ?`, [Number(fee_id)]);

      const [rows] = await conn.query('SELECT * FROM payments WHERE id = ? LIMIT 1', [r.insertId]);
      await conn.commit();

      res.status(201).json({ ok: true, payment: rows[0] });
    } catch (e) {
      try { await conn.rollback(); } catch {}
      console.error('POST /api/payments', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    } finally {
      conn.release();
    }
  });
};
