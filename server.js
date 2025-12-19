// server.js – BlueMoon / MyApateu-1 (version mới, bám DB 6 bảng)

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const session = require('express-session');
const path = require('path');

const app = express();

// ===============================
// CORS + body parser + static
// ===============================
app.use(cors({
  origin: 'http://localhost:5000', // FE cùng cổng thì thực ra không cần CORS, giữ tạm
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===============================
// MySQL Pool
// ===============================
const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'aduser',
  password: 'lienquaṇ̉',
  database: 'bluedb',
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4'
});

// ===============================
// Session
// ===============================
app.use(session({
  name: 'bluemoon.sid',
  secret: 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

// ===============================
// DB sanity check
// ===============================
(async () => {
  try {
    const [r] = await pool.query('SELECT 1 AS ok');
    console.log('[DB] connected =', r[0].ok === 1);
  } catch (e) {
    console.error('[DB] connect error:', e.code || e.message);
  }
})();

// ===============================
// Helpers
// ===============================
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ ok: false, message: 'Unauthorized' });
}

function likeParam(s) {
  return `%${(s || '').replace(/[%_]/g, '\\$&')}%`;
}
function isDateLike(s) {
  return !s || /^\d{4}-\d{2}-\d{2}$/.test(String(s));
}
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ===============================
// Routes cơ bản
// ===============================
app.get('/', (_req, res) => res.send('BlueMoon API is running'));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'bluemoon-api' }));
app.get('/api/dbcheck', async (_req, res) => {
  try {
    const [r] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, db: r[0].ok === 1 });
  } catch (e) {
    console.error('/api/dbcheck', e);
    res.status(500).json({ ok: false, message: e.code || 'DB failed' });
  }
});

// ===============================
// Auth: login / logout / me
// ===============================
app.post('/api/login', async (req, res) => {
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
    // Lưu ý: đang so sánh plain text, thực tế nên dùng bcrypt
    if (!user || user.password_hash !== password) {
      return res.status(401).json({ ok: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    req.session.userId = user.id;
    res.json({
      ok: true,
      id: user.id,
      username: user.username,
      role: user.role,
      person_id: user.person_id
    });
  } catch (e) {
    console.error('/api/login', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

app.post('/api/logout', (req, res) => {
  if (!req.session) return res.json({ ok: true });
  req.session.destroy(err => {
    if (err) return res.status(500).json({ ok: false, message: 'Cannot destroy session' });
    res.clearCookie('bluemoon.sid');
    res.json({ ok: true });
  });
});

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.session.userId);
    const [rows] = await pool.execute(
      `SELECT id, username, full_name, email, phone, role, person_id, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    if (!rows.length) return res.status(404).json({ ok: false, message: 'User not found' });
    res.json({ ok: true, user: rows[0] });
  } catch (e) {
    console.error('/api/me', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// ===============================
// Thông tin chung cư (demo)
// ===============================
app.get('/api/building', (_req, res) => {
  res.json({
    name: 'Chung cư BlueMoon',
    code: 'A1',
    address: 'Số 01 Đường Trăng Xanh, Quận M, Hà Nội',
    manager: 'Ban quản lý BlueMoon',
    contact: '0123 456 789 • bql@bluemoon.vn'
  });
});

// ==================================================
// ROOMS + RESIDENTS (rooms, persons)
// ==================================================

// GET /api/rooms?q&status&room_type
app.get('/api/rooms', async (req, res) => {
  try {
    const { q, status, room_type } = req.query;

    let sql = `
      SELECT
        r.*,
        h.full_name  AS head_name,
        h.phone      AS head_phone,
        COALESCE(cnt.cnt, 0) AS occupants_count_calc
      FROM rooms r
      LEFT JOIN persons h
        ON h.room_id = r.id AND h.relation_to_head = 'Chủ hộ'
      LEFT JOIN (
        SELECT room_id, COUNT(*) AS cnt
        FROM persons
        GROUP BY room_id
      ) cnt ON cnt.room_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (q) {
      sql += ' AND (r.room_no LIKE ? OR h.full_name LIKE ?)';
      params.push('%' + q + '%', '%' + q + '%');
    }
    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (room_type) {
      sql += ' AND r.room_type = ?';
      params.push(room_type);
    }

    sql += ' ORDER BY r.room_no + 0, r.room_no';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/rooms error:', err);
    res.status(500).json({ ok: false, message: 'Lỗi tải danh sách phòng' });
  }
});


// GET /api/rooms/:id
app.get('/api/rooms/:id', requireAuth, async (req, res) => {
  try {
    const id = toNum(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'room id không hợp lệ' });

    const [rows] = await pool.query(`
      SELECT
        r.id,
        r.room_no,
        r.building,
        r.floor,
        r.room_type,
        r.area_m2,
        r.status,
        r.contract_start,
        r.contract_end,
        r.note,
        r.created_at,
        (SELECT p.full_name FROM persons p
          WHERE p.room_id = r.id AND p.is_head = 1
          ORDER BY p.id LIMIT 1) AS head_name,
        (SELECT p.phone FROM persons p
          WHERE p.room_id = r.id AND p.is_head = 1
          ORDER BY p.id LIMIT 1) AS head_phone,
        (SELECT COUNT(*) FROM persons p WHERE p.room_id = r.id) AS occupants_count
      FROM rooms r
      WHERE r.id = ?
      LIMIT 1
    `, [id]);

    const room = rows[0];
    if (!room) return res.status(404).json({ ok: false, message: 'Room not found' });
    res.json({ ok: true, room });
  } catch (e) {
    console.error('/api/rooms/:id', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// POST /api/rooms
// Tạo phòng + tài khoản cư dân + chủ hộ (bundle)
app.post('/api/rooms', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      room_no,
      room_type,
      status,
      contract_start,
      contract_end,

      // user
      username,
      password,
      phone,
      email,
      full_name,
      role,

      // chủ hộ
      person_data
    } = req.body;

    if (!room_no) {
      return res.status(400).json({ ok: false, message: 'Thiếu room_no' });
    }

    await conn.beginTransaction();

    // 1) Tạo phòng
    const [roomResult] = await conn.query(
      `INSERT INTO rooms
         (room_no, building, floor, room_type, area_m2, status,
          contract_start, contract_end, note, created_at)
       VALUES (?, NULL, NULL, ?, NULL, ?, ?, ?, NULL, NOW())`,
      [
        room_no,
        room_type || null,
        status || null,
        contract_start || null,
        contract_end || null
      ]
    );
    const roomId = roomResult.insertId;

    // 2) Tạo chủ hộ (person)
    let personId = null;
    if (person_data && person_data.full_name) {
      const p = person_data;
      const [pRes] = await conn.query(
        `INSERT INTO persons
           (room_id, full_name, cccd, ethnicity, occupation,
            dob, hometown, relation_to_head, phone, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          roomId,
          p.full_name,
          p.cccd || null,
          p.ethnicity || null,
          p.occupation || null,
          p.dob || null,
          p.hometown || null,
          p.relation_to_head || 'Chủ hộ',
          p.phone || null
        ]
      );
      personId = pRes.insertId;
    }

    // 3) Tạo user gắn với chủ hộ
    let userId = null;
    if (username && password) {
      const userRole = role || 'RESIDENT'; // luôn lưu role RESIDENT
      const displayName = full_name || (person_data && person_data.full_name) || null;

      const [uRes] = await conn.query(
        `INSERT INTO users
           (username, password_hash, phone, email, full_name, role, person_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          username,
          password, // demo: chưa hash, bạn có thể thay bằng bcrypt.hashSync(...)
          phone || null,
          email || null,
          displayName,
          userRole,
          personId
        ]
      );
      userId = uRes.insertId;
    }

    await conn.commit();

    return res.json({
      ok: true,
      room_id: roomId,
      user_id: userId,
      person_id: personId
    });
  } catch (err) {
    console.error('POST /api/rooms error:', err);
    try { await conn.rollback(); } catch(e) {}
    return res.status(500).json({ ok: false, message: 'Lỗi tạo phòng + chủ hộ' });
  } finally {
    conn.release();
  }
});


// PUT /api/rooms/:id
app.put('/api/rooms/:id', requireAuth, async (req, res) => {
  try {
    const id = toNum(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'room id không hợp lệ' });

    const allowed = ['room_no', 'building', 'floor', 'room_type', 'area_m2',
      'status', 'contract_start', 'contract_end', 'note'];
    const sets = [];
    const vals = [];

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        if ((key === 'contract_start' || key === 'contract_end') && !isDateLike(req.body[key])) {
          return res.status(400).json({ ok: false, message: `${key} phải dạng YYYY-MM-DD hoặc null` });
        }
        sets.push(`${key} = ?`);
        if (key === 'floor') vals.push(toNum(req.body[key]));
        else if (key === 'area_m2') vals.push(req.body[key] != null ? Number(req.body[key]) : null);
        else vals.push(req.body[key] === '' ? null : req.body[key]);
      }
    }

    if (!sets.length) {
      return res.status(400).json({ ok: false, message: 'Không có trường nào để cập nhật' });
    }

    vals.push(id);
    await pool.query(`UPDATE rooms SET ${sets.join(', ')} WHERE id = ?`, vals);

    const [[room]] = await pool.query(`SELECT * FROM rooms WHERE id = ?`, [id]);
    res.json({ ok: true, room });
  } catch (e) {
    console.error('PUT /api/rooms/:id', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// DELETE /api/rooms/:id – xoá phòng + cư dân + xe + phí + thanh toán liên quan
app.delete('/api/rooms/:id', requireAuth, async (req, res) => {
  const roomId = toNum(req.params.id);
  if (!roomId) return res.status(400).json({ ok: false, message: 'room id không hợp lệ' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rooms] = await conn.query(`SELECT id FROM rooms WHERE id = ? LIMIT 1 FOR UPDATE`, [roomId]);
    if (!rooms[0]) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ ok: false, message: 'Room not found' });
    }

    // Xoá payments -> fees -> vehicles -> users -> persons -> room
    const [feeRows] = await conn.query(`SELECT id FROM fees WHERE room_id = ?`, [roomId]);
    const feeIds = feeRows.map(r => r.id);
    if (feeIds.length) {
      await conn.query(`DELETE FROM payments WHERE fee_id IN (?)`, [feeIds]);
      await conn.query(`DELETE FROM fees WHERE id IN (?)`, [feeIds]);
    }

    // Xóa xe liên quan đến phòng
    await conn.query(`DELETE FROM vehicles WHERE room_id = ?`, [roomId]);
    
    // Xóa users trước khi xóa persons (tránh lỗi foreign key)
    const [personRows] = await conn.query(`SELECT id FROM persons WHERE room_id = ?`, [roomId]);
    const personIds = personRows.map(r => r.id);
    if (personIds.length) {
      await conn.query(`DELETE FROM users WHERE person_id IN (?)`, [personIds]);
    }
    
    await conn.query(`DELETE FROM persons WHERE room_id = ?`, [roomId]);
    await conn.query(`DELETE FROM rooms WHERE id = ?`, [roomId]);

    await conn.commit();
    conn.release();
    res.json({ ok: true, room_id: roomId });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    conn.release();
    console.error('DELETE /api/rooms/:id', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// -------- PERSONS --------

// GET /api/persons?room_id
app.get('/api/persons', async (req, res) => {
  try {
    const roomId = toNum(req.query.room_id);
    const where = [];
    const vals = [];
    if (roomId) {
      where.push('room_id = ?');
      vals.push(roomId);
    }
    const sql = `
      SELECT id, room_id, full_name, cccd, ethnicity, occupation, dob,
             hometown, relation_to_head, phone, email, is_head, created_at
      FROM persons
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY (is_head = 1) DESC, full_name ASC
    `;
    const [rows] = await pool.query(sql, vals);
    res.json({ ok: true, persons: rows });
  } catch (e) {
    console.error('/api/persons', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// GET /api/rooms/:id/persons
app.get('/api/rooms/:id/persons', async (req, res) => {
  try {
    const roomId = toNum(req.params.id);
    if (!roomId) return res.status(400).json({ ok: false, message: 'room id không hợp lệ' });

    const [rows] = await pool.query(`
      SELECT id, room_id, full_name, cccd, ethnicity, occupation, dob,
             hometown, relation_to_head, phone, email, is_head, created_at
      FROM persons
      WHERE room_id = ?
      ORDER BY (is_head = 1) DESC, full_name ASC
    `, [roomId]);

    res.json({ ok: true, persons: rows });
  } catch (e) {
    console.error('/api/rooms/:id/persons', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// POST /api/persons
app.post('/api/persons', requireAuth, async (req, res) => {
  try {
    const {
      room_id,
      full_name,
      cccd,
      ethnicity,
      occupation,
      dob,
      hometown,
      relation_to_head,
      phone,
      email,
      is_head
    } = req.body || {};

    const roomId = toNum(room_id);
    if (!roomId || !full_name) {
      return res.status(400).json({ ok: false, message: 'Thiếu room_id hoặc full_name' });
    }
    if (!isDateLike(dob)) {
      return res.status(400).json({ ok: false, message: 'dob phải dạng YYYY-MM-DD hoặc null' });
    }

    const [ins] = await pool.query(
      `INSERT INTO persons
        (room_id, full_name, cccd, ethnicity, occupation, dob, hometown,
         relation_to_head, phone, email, is_head, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?, NOW())`,
      [
        roomId,
        full_name,
        cccd || null,
        ethnicity || null,
        occupation || null,
        dob || null,
        hometown || null,
        relation_to_head || null,
        phone || null,
        email || null,
        is_head ? 1 : 0
      ]
    );

    const [[person]] = await pool.query(`SELECT * FROM persons WHERE id = ?`, [ins.insertId]);
    res.status(201).json({ ok: true, person });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok: false, message: 'CCCD hoặc email đã tồn tại (nếu có ràng buộc)' });
    }
    console.error('POST /api/persons', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// PUT /api/persons/:id
app.put('/api/persons/:id', requireAuth, async (req, res) => {
  try {
    const id = toNum(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'person id không hợp lệ' });

    const allowed = ['room_id', 'full_name', 'cccd', 'ethnicity', 'occupation',
      'dob', 'hometown', 'relation_to_head', 'phone', 'email', 'is_head'];
    const sets = [];
    const vals = [];

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        if (key === 'dob' && !isDateLike(req.body[key])) {
          return res.status(400).json({ ok: false, message: 'dob phải dạng YYYY-MM-DD hoặc null' });
        }
        sets.push(`${key} = ?`);
        if (key === 'room_id') vals.push(toNum(req.body[key]));
        else if (key === 'is_head') vals.push(req.body[key] ? 1 : 0);
        else vals.push(req.body[key] === '' ? null : req.body[key]);
      }
    }
    if (!sets.length) {
      return res.status(400).json({ ok: false, message: 'Không có trường nào để cập nhật' });
    }

    vals.push(id);
    await pool.query(`UPDATE persons SET ${sets.join(', ')} WHERE id = ?`, vals);

    const [[person]] = await pool.query(`SELECT * FROM persons WHERE id = ?`, [id]);
    res.json({ ok: true, person });
  } catch (e) {
    console.error('PUT /api/persons/:id', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// POST /api/persons/bulk_delete { ids: [...] }
app.post('/api/persons/bulk_delete', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map(toNum).filter(Boolean)
      : [];
    if (!ids.length) {
      return res.status(400).json({ ok: false, message: 'Danh sách ids trống' });
    }

    const [r] = await pool.query(
      `DELETE FROM persons
       WHERE id IN (?) AND is_head = 0`,
      [ids]
    );
    res.json({ ok: true, deleted: r.affectedRows });
  } catch (e) {
    console.error('POST /api/persons/bulk_delete', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// ==================================================
// VEHICLES
// ==================================================

// GET /api/vehicles?q&room_id&parking_status
app.get('/api/vehicles', requireAuth, async (req, res) => {
  try {
    const { q = '', room_id = '', parking_status = '' } = req.query;
    const where = [];
    const vals = [];

    if (room_id) {
      where.push('v.room_id = ?');
      vals.push(toNum(room_id));
    }
    if (parking_status) {
      where.push('v.parking_status = ?');
      vals.push(parking_status);
    }
    if (q) {
      where.push(`(
        v.plate LIKE ? ESCAPE '\\\\' OR
        v.brand LIKE ? ESCAPE '\\\\' OR
        v.model LIKE ? ESCAPE '\\\\'
      )`);
      const lp = likeParam(q);
      vals.push(lp, lp, lp);
    }

    const sql = `
      SELECT
        v.id, v.room_id, v.person_id,
        v.plate, v.vehicle_type, v.brand, v.model, v.color,
        v.parking_status, v.parking_slot,
        v.last_checkin, v.last_checkout, v.parking_fee_total,
        v.created_at,
        r.room_no,
        p.full_name AS owner_name
      FROM vehicles v
      LEFT JOIN rooms r ON r.id = v.room_id
      LEFT JOIN persons p ON p.id = v.person_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY v.created_at DESC
    `;
    const [rows] = await pool.query(sql, vals);
    res.json({ ok: true, vehicles: rows });
  } catch (e) {
    console.error('/api/vehicles', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// GET /api/vehicles/:id
app.get('/api/vehicles/:id', requireAuth, async (req, res) => {
  try {
    const id = toNum(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'vehicle id không hợp lệ' });

    const [rows] = await pool.query(`
      SELECT
        v.*,
        r.room_no,
        p.full_name AS owner_name
      FROM vehicles v
      LEFT JOIN rooms r ON r.id = v.room_id
      LEFT JOIN persons p ON p.id = v.person_id
      WHERE v.id = ?
      LIMIT 1
    `, [id]);

    const vehicle = rows[0];
    if (!vehicle) return res.status(404).json({ ok: false, message: 'Vehicle not found' });
    res.json({ ok: true, vehicle });
  } catch (e) {
    console.error('/api/vehicles/:id', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// POST /api/vehicles
app.post('/api/vehicles', requireAuth, async (req, res) => {
  try {
    const {
      room_id,
      person_id,
      plate,
      vehicle_type,
      brand,
      model,
      color
    } = req.body || {};

    const roomId = toNum(room_id);
    if (!roomId || !plate) {
      return res.status(400).json({ ok: false, message: 'Thiếu room_id hoặc plate' });
    }

    const [ins] = await pool.query(
      `INSERT INTO vehicles
        (room_id, person_id, plate, vehicle_type, brand, model, color,
         parking_status, parking_slot, last_checkin, last_checkout,
         parking_fee_total, created_at)
       VALUES (?,?,?,?,?,?,?,?,NULL,NULL,NULL,0, NOW())`,
      [
        roomId,
        toNum(person_id),
        plate,
        vehicle_type || 'MOTORBIKE',
        brand || null,
        model || null,
        color || null,
        'OUT'
      ]
    );

    const [[vehicle]] = await pool.query(`SELECT * FROM vehicles WHERE id = ?`, [ins.insertId]);
    res.status(201).json({ ok: true, vehicle });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok: false, message: 'Biển số xe đã tồn tại' });
    }
    console.error('POST /api/vehicles', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// PUT /api/vehicles/:id
app.put('/api/vehicles/:id', requireAuth, async (req, res) => {
  try {
    const id = toNum(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'vehicle id không hợp lệ' });

    const allowed = ['room_id', 'person_id', 'plate', 'vehicle_type', 'brand',
      'model', 'color', 'parking_status', 'parking_slot'];
    const sets = [];
    const vals = [];

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        sets.push(`${key} = ?`);
        if (key === 'room_id' || key === 'person_id') vals.push(toNum(req.body[key]));
        else vals.push(req.body[key] === '' ? null : req.body[key]);
      }
    }
    if (!sets.length) {
      return res.status(400).json({ ok: false, message: 'Không có trường nào để cập nhật' });
    }

    vals.push(id);
    await pool.query(`UPDATE vehicles SET ${sets.join(', ')} WHERE id = ?`, vals);

    const [[vehicle]] = await pool.query(`SELECT * FROM vehicles WHERE id = ?`, [id]);
    res.json({ ok: true, vehicle });
  } catch (e) {
    console.error('PUT /api/vehicles/:id', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// DELETE /api/vehicles/:id
app.delete('/api/vehicles/:id', requireAuth, async (req, res) => {
  const id = toNum(req.params.id);
  if (!id) return res.status(400).json({ ok: false, message: 'vehicle id không hợp lệ' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[vehicle]] = await conn.query(
      `SELECT id FROM vehicles WHERE id = ? LIMIT 1 FOR UPDATE`, [id]
    );
    if (!vehicle) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ ok: false, message: 'Vehicle not found' });
    }

    // Xoá fees & payments gắn với vehicle
    const [feeRows] = await conn.query(`SELECT id FROM fees WHERE vehicle_id = ?`, [id]);
    const feeIds = feeRows.map(r => r.id);
    if (feeIds.length) {
      await conn.query(`DELETE FROM payments WHERE fee_id IN (?)`, [feeIds]);
      await conn.query(`DELETE FROM fees WHERE id IN (?)`, [feeIds]);
    }

    await conn.query(`DELETE FROM vehicles WHERE id = ?`, [id]);

    await conn.commit();
    conn.release();
    res.json({ ok: true, vehicle_id: id });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    conn.release();
    console.error('DELETE /api/vehicles/:id', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// POST /api/vehicles/:id/checkin { parking_slot }
app.post('/api/vehicles/:id/checkin', requireAuth, async (req, res) => {
  try {
    const id = toNum(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'vehicle id không hợp lệ' });

    const { parking_slot } = req.body || {};

    await pool.query(
      `UPDATE vehicles
       SET parking_status = 'IN',
           parking_slot = ?,
           last_checkin = NOW(),
           last_checkout = NULL
       WHERE id = ?`,
      [parking_slot || null, id]
    );

    const [[vehicle]] = await pool.query(`SELECT * FROM vehicles WHERE id = ?`, [id]);
    res.json({ ok: true, vehicle });
  } catch (e) {
    console.error('POST /api/vehicles/:id/checkin', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// POST /api/vehicles/:id/checkout { fee_name, unit_price, quantity }
app.post('/api/vehicles/:id/checkout', requireAuth, async (req, res) => {
  const id = toNum(req.params.id);
  if (!id) return res.status(400).json({ ok: false, message: 'vehicle id không hợp lệ' });

  const { fee_name = 'Phí gửi xe', unit_price = 0, quantity = 1 } = req.body || {};
  const price = Number(unit_price);
  const qty = Number(quantity);

  if (!Number.isFinite(price) || price < 0 || !Number.isFinite(qty) || qty < 0) {
    return res.status(400).json({ ok: false, message: 'unit_price và quantity phải là số không âm' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lấy thông tin xe
    const [[vehicle]] = await conn.query(
      `SELECT * FROM vehicles WHERE id = ? LIMIT 1 FOR UPDATE`, [id]
    );
    if (!vehicle) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ ok: false, message: 'Vehicle not found' });
    }

    const total = Math.round(price * qty * 100) / 100;

    // Cập nhật trạng thái gửi xe
    await conn.query(
      `UPDATE vehicles
       SET parking_status = 'OUT',
           last_checkout = NOW(),
           parking_fee_total = parking_fee_total + ?
       WHERE id = ?`,
      [total, id]
    );

    // Tạo một fee (phí gửi xe) gắn với vehicle + room
    const [fRes] = await conn.query(
      `INSERT INTO fees
        (room_id, person_id, vehicle_id,
         fee_name, fee_type, period,
         quantity, unit_price, amount_due,
         amount_paid, due_date, status, note, created_at)
       VALUES (?,?,?,?,? ,NULL ,?,?,? ,0 ,CURDATE(), 'UNPAID', NULL, NOW())`,
      [
        vehicle.room_id,
        vehicle.person_id,
        id,
        fee_name,
        'PARKING',
        qty,
        price,
        total
      ]
    );

    await conn.commit();
    conn.release();

    const [[fee]] = await pool.query(`SELECT * FROM fees WHERE id = ?`, [fRes.insertId]);
    res.json({ ok: true, vehicle_id: id, fee });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    conn.release();
    console.error('POST /api/vehicles/:id/checkout', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});
// GET /api/parking/statistics?from=YYYY-MM-DD&to=YYYY-MM-DD
app.get('/api/parking/statistics', requireAuth, async (req, res) => {
  const from = (req.query.from || '').trim();
  const to   = (req.query.to || '').trim();

  if (!from || !to || !isDateLike(from) || !isDateLike(to)) {
    return res.status(400).json({
      ok: false,
      message: 'from/to phải dạng YYYY-MM-DD và không được rỗng'
    });
  }

  const conn = await pool.getConnection();
  try {
    // Tổng quan: số fee gửi xe, tổng tiền phải thu, đã thu, theo trạng thái
    const summarySql = `
      SELECT
        COUNT(*) AS total_fees,
        SUM(f.amount_due)  AS total_amount_due,
        SUM(f.amount_paid) AS total_amount_paid
      FROM fees f
      WHERE f.fee_type = 'PARKING'
        AND f.created_at >= ? AND f.created_at < DATE_ADD(?, INTERVAL 1 DAY)
    `;
    const [summaryRows] = await conn.query(summarySql, [from, to]);
    const summary = summaryRows[0] || {
      total_fees: 0,
      total_amount_due: 0,
      total_amount_paid: 0
    };

    // Thống kê theo status
    const byStatusSql = `
      SELECT f.status, COUNT(*) AS cnt,
             SUM(f.amount_due)  AS amount_due,
             SUM(f.amount_paid) AS amount_paid
      FROM fees f
      WHERE f.fee_type = 'PARKING'
        AND f.created_at >= ? AND f.created_at < DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY f.status
    `;
    const [statusRows] = await conn.query(byStatusSql, [from, to]);

    // Thống kê theo ngày (phục vụ vẽ chart)
    const byDaySql = `
      SELECT
        DATE(f.created_at) AS day,
        COUNT(*)           AS total_fees,
        SUM(f.amount_due)  AS total_amount_due,
        SUM(f.amount_paid) AS total_amount_paid
      FROM fees f
      WHERE f.fee_type = 'PARKING'
        AND f.created_at >= ? AND f.created_at < DATE_ADD(?, INTERVAL 1 DAY)
      GROUP BY DATE(f.created_at)
      ORDER BY day ASC
    `;
    const [dayRows] = await conn.query(byDaySql, [from, to]);

    res.json({
      ok: true,
      from,
      to,
      summary,
      by_status: statusRows,
      by_day: dayRows
    });
  } catch (e) {
    console.error('/api/parking/statistics', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  } finally {
    conn.release();
  }
});
// GET /api/parking/vehicles-in-lot
// -> Dùng cho màn "Xem sơ đồ bãi đậu" – FE sẽ map slot -> vị trí trên sơ đồ.
app.get('/api/parking/vehicles-in-lot', requireAuth, async (req, res) => {
  try {
    const { room_id = '', q = '' } = req.query;
    const where = [`v.parking_status = 'IN'`];
    const vals = [];

    if (room_id) {
      where.push('v.room_id = ?');
      vals.push(toNum(room_id));
    }
    if (q) {
      // cho phép tìm gần theo biển số / chủ xe / phòng
      where.push(`(
        v.plate LIKE ? ESCAPE '\\\\' OR
        p.full_name LIKE ? ESCAPE '\\\\' OR
        r.room_no LIKE ? ESCAPE '\\\\'
      )`);
      const lp = likeParam(q);
      vals.push(lp, lp, lp);
    }

    const sql = `
      SELECT
        v.id, v.room_id, v.person_id,
        v.plate, v.vehicle_type, v.brand, v.model, v.color,
        v.parking_status, v.parking_slot,
        v.last_checkin, v.last_checkout, v.parking_fee_total,
        v.created_at,
        r.room_no,
        p.full_name AS owner_name
      FROM vehicles v
      LEFT JOIN rooms r   ON r.id = v.room_id
      LEFT JOIN persons p ON p.id = v.person_id
      WHERE ${where.join(' AND ')}
      ORDER BY v.parking_slot ASC, v.plate ASC
    `;
    const [rows] = await pool.query(sql, vals);
    res.json({ ok: true, vehicles: rows });
  } catch (e) {
    console.error('/api/parking/vehicles-in-lot', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});


// ==================================================
// FEES + PAYMENTS
// ==================================================

// GET /api/fees?q&fee_type&status&period&room_id&vehicle_id&page&page_size
app.get('/api/fees', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim();
  const fee_type = (req.query.fee_type || '').trim();  // 'ROOM' | 'PARKING' | 'OTHER'
  const status = (req.query.status || '').trim();      // 'UNPAID' | ...
  const period = (req.query.period || '').trim();      // 'YYYY-MM'
  const room_id = toNum(req.query.room_id);
  const vehicle_id = toNum(req.query.vehicle_id);

  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const page_size = Math.min(100, Math.max(1, parseInt(req.query.page_size || '20', 10)));
  const offset = (page - 1) * page_size;

  const conn = await pool.getConnection();
  try {
    let where = `1=1`;
    const params = [];

    if (q) {
      where += ` AND (
        f.fee_name LIKE ? ESCAPE '\\\\' OR
        r.room_no LIKE ? ESCAPE '\\\\' OR
        v.plate LIKE ? ESCAPE '\\\\'
      )`;
      const lp = likeParam(q);
      params.push(lp, lp, lp);
    }
    if (fee_type) {
      where += ` AND f.fee_type = ?`;
      params.push(fee_type);
    }
    if (status) {
      where += ` AND f.status = ?`;
      params.push(status);
    }
    if (period) {
      where += ` AND f.period = ?`;
      params.push(period);
    }
    if (room_id) {
      where += ` AND f.room_id = ?`;
      params.push(room_id);
    }
    if (vehicle_id) {
      where += ` AND f.vehicle_id = ?`;
      params.push(vehicle_id);
    }

    const sqlCount = `
      SELECT COUNT(*) AS cnt
      FROM fees f
      LEFT JOIN rooms r   ON r.id = f.room_id
      LEFT JOIN vehicles v ON v.id = f.vehicle_id
      WHERE ${where}
    `;
    const sqlData = `
      SELECT
        f.*,
        r.room_no,
        v.plate,
        (SELECT SUM(p.amount) FROM payments p WHERE p.fee_id = f.id) AS paid_sum
      FROM fees f
      LEFT JOIN rooms r   ON r.id = f.room_id
      LEFT JOIN vehicles v ON v.id = f.vehicle_id
      WHERE ${where}
      ORDER BY f.created_at DESC
      LIMIT ?, ?
    `;

    const [countRows] = await conn.query(sqlCount, params);
    params.push(offset, page_size);
    const [rows] = await conn.query(sqlData, params);

    res.json({
      ok: true,
      items: rows,
      total: countRows[0]?.cnt || 0,
      page,
      page_size
    });
  } catch (e) {
    console.error('/api/fees', e);
    res.status(500).json({ ok: false, message: e.code || e.message || 'Server error' });
  } finally {
    conn.release();
  }
});

// GET /api/fees/:id
app.get('/api/fees/:id', requireAuth, async (req, res) => {
  try {
    const id = toNum(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'fee id không hợp lệ' });

    const [rows] = await pool.query(`
      SELECT
        f.*,
        r.room_no,
        v.plate
      FROM fees f
      LEFT JOIN rooms r   ON r.id = f.room_id
      LEFT JOIN vehicles v ON v.id = f.vehicle_id
      WHERE f.id = ?
      LIMIT 1
    `, [id]);

    const fee = rows[0];
    if (!fee) return res.status(404).json({ ok: false, message: 'Fee not found' });
    res.json({ ok: true, fee });
  } catch (e) {
    console.error('/api/fees/:id', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// POST /api/fees
app.post('/api/fees', requireAuth, async (req, res) => {
  try {
    const {
      room_id,
      person_id,
      vehicle_id,
      fee_name,
      fee_type,
      period,
      quantity,
      unit_price,
      due_date,
      note
    } = req.body || {};

    if (!fee_name) {
      return res.status(400).json({ ok: false, message: 'Thiếu fee_name' });
    }
    const feeType = fee_type || 'ROOM';
    const qty = Number(quantity ?? 1);
    const price = Number(unit_price ?? 0);
    if (!Number.isFinite(qty) || qty < 0 || !Number.isFinite(price) || price < 0) {
      return res.status(400).json({ ok: false, message: 'quantity & unit_price phải là số không âm' });
    }
    if (!isDateLike(due_date)) {
      return res.status(400).json({ ok: false, message: 'due_date phải dạng YYYY-MM-DD hoặc null' });
    }

    const total = Math.round(qty * price * 100) / 100;

    const [ins] = await pool.query(
      `INSERT INTO fees
        (room_id, person_id, vehicle_id,
         fee_name, fee_type, period,
         quantity, unit_price, amount_due,
         amount_paid, due_date, status, note, created_at)
       VALUES (?,?,?,?,?,?,?,?,? ,0 ,?, 'UNPAID', ?, NOW())`,
      [
        toNum(room_id),
        toNum(person_id),
        toNum(vehicle_id),
        fee_name,
        feeType,
        period || null,
        qty,
        price,
        total,
        due_date || null,
        note || null
      ]
    );

    const [[fee]] = await pool.query(`SELECT * FROM fees WHERE id = ?`, [ins.insertId]);
    res.status(201).json({ ok: true, fee });
  } catch (e) {
    console.error('POST /api/fees', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// PUT /api/fees/:id
app.put('/api/fees/:id', requireAuth, async (req, res) => {
  try {
    const id = toNum(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'fee id không hợp lệ' });

    const fields = [];
    const params = [];

    function setField(col, val) {
      fields.push(`${col} = ?`);
      params.push(val);
    }

    if ('room_id' in req.body) setField('room_id', toNum(req.body.room_id));
    if ('person_id' in req.body) setField('person_id', toNum(req.body.person_id));
    if ('vehicle_id' in req.body) setField('vehicle_id', toNum(req.body.vehicle_id));
    if ('fee_name' in req.body) setField('fee_name', req.body.fee_name || null);
    if ('fee_type' in req.body) setField('fee_type', req.body.fee_type || 'ROOM');
    if ('period' in req.body) setField('period', req.body.period || null);
    if ('quantity' in req.body) setField('quantity', Number(req.body.quantity));
    if ('unit_price' in req.body) setField('unit_price', Number(req.body.unit_price));
    if ('amount_due' in req.body) setField('amount_due', Number(req.body.amount_due));
    if ('amount_paid' in req.body) setField('amount_paid', Number(req.body.amount_paid));
    if ('due_date' in req.body) {
      if (!isDateLike(req.body.due_date)) {
        return res.status(400).json({ ok: false, message: 'due_date phải dạng YYYY-MM-DD hoặc null' });
      }
      setField('due_date', req.body.due_date || null);
    }
    if ('status' in req.body) setField('status', req.body.status || 'UNPAID');
    if ('note' in req.body) setField('note', req.body.note || null);

    if (!fields.length) {
      return res.status(400).json({ ok: false, message: 'Không có trường nào để cập nhật' });
    }

    params.push(id);
    await pool.query(`UPDATE fees SET ${fields.join(', ')} WHERE id = ?`, params);

    const [[fee]] = await pool.query(`SELECT * FROM fees WHERE id = ?`, [id]);
    res.json({ ok: true, fee });
  } catch (e) {
    console.error('PUT /api/fees/:id', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// DELETE /api/fees/:id
app.delete('/api/fees/:id', requireAuth, async (req, res) => {
  const id = toNum(req.params.id);
  if (!id) return res.status(400).json({ ok: false, message: 'fee id không hợp lệ' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[fee]] = await conn.query(`SELECT id FROM fees WHERE id = ? LIMIT 1 FOR UPDATE`, [id]);
    if (!fee) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ ok: false, message: 'Fee not found' });
    }

    await conn.query(`DELETE FROM payments WHERE fee_id = ?`, [id]);
    await conn.query(`DELETE FROM fees WHERE id = ?`, [id]);

    await conn.commit();
    conn.release();
    res.json({ ok: true, deleted_id: id });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    conn.release();
    console.error('DELETE /api/fees/:id', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// -------- PAYMENTS --------

// GET /api/fees/:id/payments
app.get('/api/fees/:id/payments', requireAuth, async (req, res) => {
  try {
    const feeId = toNum(req.params.id);
    if (!feeId) return res.status(400).json({ ok: false, message: 'fee id không hợp lệ' });

    const [rows] = await pool.query(`
      SELECT p.*, u.full_name AS created_by_name
      FROM payments p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.fee_id = ?
      ORDER BY p.payment_date DESC
    `, [feeId]);

    res.json({ ok: true, payments: rows });
  } catch (e) {
    console.error('/api/fees/:id/payments', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// POST /api/payments
// body: { fee_id, amount, method, note }
app.post('/api/payments', requireAuth, async (req, res) => {
  const userId = Number(req.session.userId);

  try {
    const { fee_id, amount, method, note } = req.body || {};
    const feeId = toNum(fee_id);
    const amt = Number(amount);

    if (!feeId || !Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ ok: false, message: 'fee_id hoặc amount không hợp lệ' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[fee]] = await conn.query(
        `SELECT id, amount_due, amount_paid, status FROM fees WHERE id = ? FOR UPDATE`,
        [feeId]
      );
      if (!fee) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ ok: false, message: 'Fee not found' });
      }

      const newPaid = Math.round((fee.amount_paid + amt) * 100) / 100;
      let newStatus = fee.status;
      if (newPaid <= 0) newStatus = 'UNPAID';
      else if (newPaid < fee.amount_due) newStatus = 'PARTIAL';
      else newStatus = 'PAID';

      const [ins] = await conn.query(
        `INSERT INTO payments
          (fee_id, user_id, payment_date, amount, method, note, created_at)
         VALUES (?,?,NOW(),?,?,?, NOW())`,
        [feeId, userId || null, amt, method || 'CASH', note || null]
      );

      await conn.query(
        `UPDATE fees
         SET amount_paid = ?, status = ?
         WHERE id = ?`,
        [newPaid, newStatus, feeId]
      );

      await conn.commit();
      conn.release();

      const [[payment]] = await pool.query(`SELECT * FROM payments WHERE id = ?`, [ins.insertId]);
      res.status(201).json({ ok: true, payment, fee_id: feeId, new_status: newStatus, new_amount_paid: newPaid });
    } catch (e) {
      try { await conn.rollback(); } catch {}
      conn.release();
      console.error('POST /api/payments', e);
      res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  } catch (e) {
    console.error('POST /api/payments outer', e);
    res.status(500).json({ ok: false, message: e.code || 'Server error' });
  }
});

// ===============================
// Start server
// ===============================
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
