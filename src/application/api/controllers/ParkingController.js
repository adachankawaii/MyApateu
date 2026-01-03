// src/application/api/controllers/ParkingController.js
const { pool } = require('../../../infrastructure/db/dbConnector');
const { requireAuth } = require('../../middleware/RequireAuthMiddleware');
const { likeParam, isDateLike, toNum } = require('../../../domain/shared/DomainUtils');

module.exports = function ParkingController(router) {
  // ===============================================
  // VEHICLES
  // ===============================================

  router.get('/api/vehicles', requireAuth, async (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      const room_id = toNum(req.query.room_id);
      const plate = (req.query.plate || '').trim();
      const vehicle_type = (req.query.vehicle_type || '').trim();
      const parking_status = (req.query.parking_status || '').trim();

      let sql = `
        SELECT v.*, r.room_no
        FROM vehicles v
        LEFT JOIN rooms r ON r.id = v.room_id
        WHERE 1=1
      `;
      const vals = [];

      if (room_id !== null) {
        sql += ' AND v.room_id = ?';
        vals.push(room_id);
      }
      if (plate) {
        sql += ' AND v.plate_no LIKE ?';
        vals.push(likeParam(plate));
      }
      if (vehicle_type) {
        sql += ' AND v.vehicle_type = ?';
        vals.push(vehicle_type);
      }
      if (parking_status) {
        sql += ' AND v.parking_status = ?';
        vals.push(parking_status);
      }
      if (q) {
        sql += ' AND (v.plate_no LIKE ? OR v.owner_name LIKE ? OR r.room_no LIKE ?)';
        const lp = likeParam(q);
        vals.push(lp, lp, lp);
      }

      sql += ' ORDER BY v.id DESC';

      const [rows] = await pool.query(sql, vals);
      res.json({ ok: true, vehicles: rows });
    } catch (e) {
      console.error('GET /api/vehicles', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.get('/api/vehicles/:id', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [rows] = await pool.query('SELECT * FROM vehicles WHERE id = ? LIMIT 1', [id]);
      const v = rows[0];
      if (!v) return res.status(404).json({ ok: false, message: 'Vehicle not found' });
      res.json({ ok: true, vehicle: v });
    } catch (e) {
      console.error('GET /api/vehicles/:id', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.post('/api/vehicles', requireAuth, async (req, res) => {
    try {
      const { room_id, plate_no, vehicle_type, owner_name } = req.body || {};
      if (!room_id || !plate_no) {
        return res.status(400).json({ ok: false, message: 'room_id and plate_no are required' });
      }

      const [r] = await pool.execute(
        `INSERT INTO vehicles (room_id, plate_no, vehicle_type, owner_name, parking_status)
         VALUES (?, ?, ?, ?, 'OUT')`,
        [
          Number(room_id),
          String(plate_no).trim(),
          vehicle_type ? String(vehicle_type).trim() : null,
          owner_name ? String(owner_name).trim() : null
        ]
      );

      const [rows] = await pool.query('SELECT * FROM vehicles WHERE id = ? LIMIT 1', [r.insertId]);
      res.status(201).json({ ok: true, vehicle: rows[0] });
    } catch (e) {
      console.error('POST /api/vehicles', e);
      if (e && e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ ok: false, message: 'plate_no already exists' });
      }
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.put('/api/vehicles/:id', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { room_id, plate_no, vehicle_type, owner_name, parking_status } = req.body || {};

      const fields = [];
      const params = [];

      if (room_id !== undefined) {
        fields.push('room_id = ?');
        params.push(room_id === null || room_id === '' ? null : Number(room_id));
      }
      if (plate_no !== undefined) {
        fields.push('plate_no = ?');
        params.push(plate_no ? String(plate_no).trim() : null);
      }
      if (vehicle_type !== undefined) {
        fields.push('vehicle_type = ?');
        params.push(vehicle_type ? String(vehicle_type).trim() : null);
      }
      if (owner_name !== undefined) {
        fields.push('owner_name = ?');
        params.push(owner_name ? String(owner_name).trim() : null);
      }
      if (parking_status !== undefined) {
        fields.push('parking_status = ?');
        params.push(parking_status ? String(parking_status).trim() : null);
      }

      if (!fields.length) {
        return res.status(400).json({ ok: false, message: 'Không có trường nào để cập nhật' });
      }

      params.push(id);

      const [r] = await pool.execute(`UPDATE vehicles SET ${fields.join(', ')} WHERE id = ?`, params);
      if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: 'Vehicle not found' });

      const [rows] = await pool.query('SELECT * FROM vehicles WHERE id = ? LIMIT 1', [id]);
      res.json({ ok: true, vehicle: rows[0] });
    } catch (e) {
      console.error('PUT /api/vehicles/:id', e);
      if (e && e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ ok: false, message: 'plate_no already exists' });
      }
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.delete('/api/vehicles/:id', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [r] = await pool.execute('DELETE FROM vehicles WHERE id = ?', [id]);
      if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: 'Vehicle not found' });
      res.json({ ok: true });
    } catch (e) {
      console.error('DELETE /api/vehicles/:id', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  // ===============================================
  // PARKING: checkin / checkout + list in-lot + statistics
  // ===============================================

  router.post('/api/parking/checkin', requireAuth, async (req, res) => {
    try {
      const vehicle_id = toNum(req.body?.vehicle_id);
      if (vehicle_id === null) return res.status(400).json({ ok: false, message: 'vehicle_id required' });

      const now = new Date();
      const [r] = await pool.execute(
        `UPDATE vehicles
         SET parking_status = 'IN',
             checkin_time = ?
         WHERE id = ?`,
        [now, vehicle_id]
      );
      if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: 'Vehicle not found' });

      res.json({ ok: true, checkin_time: now });
    } catch (e) {
      console.error('POST /api/parking/checkin', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.post('/api/parking/checkout', requireAuth, async (req, res) => {
    try {
      const vehicle_id = toNum(req.body?.vehicle_id);
      if (vehicle_id === null) return res.status(400).json({ ok: false, message: 'vehicle_id required' });

      const now = new Date();
      const [r] = await pool.execute(
        `UPDATE vehicles
         SET parking_status = 'OUT',
             checkout_time = ?
         WHERE id = ?`,
        [now, vehicle_id]
      );
      if (r.affectedRows === 0) return res.status(404).json({ ok: false, message: 'Vehicle not found' });

      res.json({ ok: true, checkout_time: now });
    } catch (e) {
      console.error('POST /api/parking/checkout', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.get('/api/parking/vehicles-in-lot', requireAuth, async (req, res) => {
    try {
      const q = (req.query.q || '').trim();
      const room_id = toNum(req.query.room_id);
      const plate = (req.query.plate || '').trim();
      const vehicle_type = (req.query.vehicle_type || '').trim();

      let sql = `
        SELECT v.*, r.room_no
        FROM vehicles v
        LEFT JOIN rooms r ON r.id = v.room_id
        WHERE v.parking_status = 'IN'
      `;
      const params = [];

      if (room_id !== null) {
        sql += ' AND v.room_id = ?';
        params.push(room_id);
      }
      if (plate) {
        sql += ' AND v.plate_no LIKE ?';
        params.push(likeParam(plate));
      }
      if (vehicle_type) {
        sql += ' AND v.vehicle_type = ?';
        params.push(vehicle_type);
      }
      if (q) {
        sql += ' AND (v.plate_no LIKE ? OR v.owner_name LIKE ? OR r.room_no LIKE ?)';
        const lp = likeParam(q);
        params.push(lp, lp, lp);
      }

      sql += ' ORDER BY v.checkin_time DESC, v.id DESC';

      const [rows] = await pool.query(sql, params);
      res.json({ ok: true, vehicles: rows });
    } catch (e) {
      console.error('GET /api/parking/vehicles-in-lot', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });

  router.get('/api/parking/statistics', requireAuth, async (req, res) => {
    try {
      const date_from = (req.query.date_from || '').trim();
      const date_to = (req.query.date_to || '').trim();
      if (date_from && !isDateLike(date_from)) return res.status(400).json({ ok: false, message: 'date_from must be YYYY-MM-DD' });
      if (date_to && !isDateLike(date_to)) return res.status(400).json({ ok: false, message: 'date_to must be YYYY-MM-DD' });

      let where = 'WHERE 1=1';
      const params = [];

      if (date_from) {
        where += ' AND DATE(v.checkin_time) >= ?';
        params.push(date_from);
      }
      if (date_to) {
        where += ' AND DATE(v.checkin_time) <= ?';
        params.push(date_to);
      }

      const [rows] = await pool.query(
        `
        SELECT
          SUM(CASE WHEN v.parking_status='IN' THEN 1 ELSE 0 END) AS in_count,
          SUM(CASE WHEN v.parking_status='OUT' THEN 1 ELSE 0 END) AS out_count,
          COUNT(*) AS total
        FROM vehicles v
        ${where}
        `,
        params
      );

      res.json({ ok: true, stats: rows[0] || { in_count: 0, out_count: 0, total: 0 } });
    } catch (e) {
      console.error('GET /api/parking/statistics', e);
      res.status(500).json({ ok: false, message: 'Server error' });
    }
  });
};
