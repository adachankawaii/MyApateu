// server.js
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const session = require('express-session');
const path = require('path');

const app = express();

// ====== CORS ======
app.use(cors({
  origin: 'http://localhost:5000',
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ====== cấu hình DB ======
const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'aduser',
  password: 'lienquaṇ̉',
  database: 'bluedb',
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4'
});

// ====== Session ======
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

// ====== DB sanity check ======
(async () => {
  try {
    const [r] = await pool.query('SELECT 1 AS ok');
    console.log('[DB] connected =', r[0].ok === 1);
  } catch (e) {
    console.error('[DB] connect error:', e.code || e.message);
  }
})();

// ====== Routes cơ bản ======
app.get('/', (_req, res) => res.send('BlueMoon API is running'));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'bluemoon-api' }));
app.get('/api/dbcheck', async (_req,res)=>{
  try{ const [r]=await pool.query('SELECT 1 AS ok'); res.json({ok:true, db:r[0].ok===1}); }
  catch(e){ console.error('/api/dbcheck',e); res.status(500).json({ok:false, message:e.code||'DB failed'}); }
});

// ====== Auth helpers ======
function requireAuth(req, res, next){
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ ok:false, message:'Unauthorized' });
}

// ====== API: Login / Logout / Me ======
app.post('/api/login', async (req,res)=>{
  try{
    const username = (req.body?.username||'').trim();
    const password = req.body?.password||'';
    if(!username||!password) return res.status(400).json({ok:false,message:'Thiếu tài khoản hoặc mật khẩu'});

    // Đăng nhập bằng username (email cho phép trùng, nên KHÔNG dùng email ở đây)
    const [rows] = await pool.execute(
      'SELECT id, username, password_hash, role FROM users WHERE username=? LIMIT 1',
      [username]
    );
    const user = rows[0];
    if(!user || user.password_hash !== password){
      return res.status(401).json({ok:false,message:'Sai tên đăng nhập hoặc mật khẩu'});
    }

    req.session.userId = user.id;
    res.json({ok:true, user_id:user.id, username:user.username, role:user.role});
  }catch(e){
    console.error('/api/login error', e);
    res.status(500).json({ok:false, message:e.code||'Lỗi server'});
  }
});

app.post('/api/logout', (req, res) => {
  if (!req.session) return res.json({ ok:true });
  req.session.destroy(err => {
    if (err) return res.status(500).json({ ok:false, message:'Cannot destroy session' });
    res.clearCookie('bluemoon.sid');
    res.json({ ok:true });
  });
});

// /api/me trả thêm email
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.session.userId);
    const [rows] = await pool.execute(
      `SELECT full_name, username, email, role, created_at, phone
       FROM users WHERE id = ? LIMIT 1`,
      [userId] // <-- thiếu dấu phẩy trước đây, đã fix
    );
    if (!rows.length) return res.status(404).json({ ok:false, message:'User not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('/api/me', e);
    res.status(500).json({ ok:false, message:e.code || 'Server error' });
  }
});

// ====== Thông tin chung cư (hard-code) ======
app.get('/api/building', (_req, res) => {
  res.json({
    name: 'Chung cư BlueMoon',
    code: 'A1',
    address: 'Số 01 Đường Trăng Xanh, Quận M, Hà Nội',
    manager: 'Ban quản lý BlueMoon',
    contact: '0123 456 789 • bql@bluemoon.vn'
  });
});

// ===== Helpers =====
function likeParam(s){ return `%${(s||'').replace(/[%_]/g, '\\$&')}%`; }
function nz(v){ return (v === '' || v === undefined) ? null : v; }
function nzNum(v){
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function isDateLike(s){ return !s || /^\d{4}-\d{2}-\d{2}$/.test(s); }

// ===== GET /api/rooms — danh sách phòng =====
app.get('/api/rooms', async (req, res) => {
  try{
    const { q = '', status = '', room_type = '' } = req.query;

    const where = [];
    const vals  = [];

    if (status)    { where.push('r.status = ?');     vals.push(status); }
    if (room_type) { where.push('r.room_type = ?');  vals.push(room_type); }
    if (q) {
      where.push(`(
        r.room_no LIKE ? ESCAPE '\\\\' OR
        (SELECT full_name FROM persons p
           WHERE p.room_id = r.id AND p.relation_to_head = 'Chủ hộ'
           ORDER BY p.id LIMIT 1
        ) LIKE ? ESCAPE '\\\\'
      )`);
      const like = `%${q.replace(/[%_]/g, '\\$&')}%`;
      vals.push(like, like);
    }

    const sql = `
      SELECT
        r.id, r.room_no, r.occupants_count, r.room_type,
        r.contract_start, r.contract_end, r.status, r.user_id, r.created_at,
        (SELECT full_name FROM persons p
           WHERE p.room_id = r.id AND p.relation_to_head='Chủ hộ'
           ORDER BY p.id LIMIT 1) AS head_name,
        (SELECT phone FROM persons p
           WHERE p.room_id = r.id AND p.relation_to_head='Chủ hộ'
           ORDER BY p.id LIMIT 1) AS head_phone,
        (SELECT COUNT(*) FROM persons p WHERE p.room_id = r.id) AS occupants_count_calc
      FROM rooms r
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY r.room_no + 0, r.room_no
    `;
    const [rows] = await pool.query(sql, vals);
    res.json(rows);
  }catch(e){
    console.error('/api/rooms', e);
    res.status(500).json({ ok:false, message:e.code || 'Server error' });
  }
});

// ===== GET /api/rooms/:id — chi tiết phòng =====
app.get('/api/rooms/:id', async (req, res) => {
  try{
    const id = Number(req.params.id);
    const [[room]] = await pool.query(`
      SELECT
        r.id, r.room_no, r.occupants_count, r.room_type,
        r.contract_start, r.contract_end, r.status, r.user_id, r.created_at,
        (SELECT full_name FROM persons p
           WHERE p.room_id = r.id AND p.relation_to_head='Chủ hộ'
           ORDER BY p.id LIMIT 1) AS head_name,
        (SELECT phone FROM persons p
           WHERE p.room_id = r.id AND p.relation_to_head='Chủ hộ'
           ORDER BY p.id LIMIT 1) AS head_phone,
        (SELECT COUNT(*) FROM persons p WHERE p.room_id = r.id) AS occupants_count_calc
      FROM rooms r
      WHERE r.id = ?
      LIMIT 1
    `,[id]);
    if(!room) return res.status(404).json({ ok:false, message:'Room not found' });
    res.json(room);
  }catch(e){
    console.error('/api/rooms/:id', e);
    res.status(500).json({ ok:false, message:e.code || 'Server error' });
  }
});

// ===== GET /api/persons — liệt kê cư dân =====
app.get('/api/persons', async (req, res) => {
  try{
    const { room_id='' } = req.query;
    const where = [];
    const vals  = [];
    if (room_id){ where.push('room_id = ?'); vals.push(Number(room_id)); }

    const sql = `
      SELECT id, full_name, cccd, ethnicity, occupation, dob, hometown,
             relation_to_head, phone, room_id, created_at
      FROM persons
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY (relation_to_head='Chủ hộ') DESC, full_name ASC
    `;
    const [rows] = await pool.query(sql, vals);
    res.json(rows);
  }catch(e){
    console.error('/api/persons', e);
    res.status(500).json({ ok:false, message:e.code || 'Server error' });
  }
});

// ===== GET /api/rooms/:id/persons — cư dân của 1 phòng =====
app.get('/api/rooms/:id/persons', async (req, res) => {
  try{
    const id = Number(req.params.id);
    const [rows] = await pool.query(`
      SELECT id, full_name, cccd, ethnicity, occupation, dob, hometown,
             relation_to_head, phone, room_id, created_at
      FROM persons
      WHERE room_id = ?
      ORDER BY (relation_to_head='Chủ hộ') DESC, full_name ASC
    `,[id]);
    res.json(rows);
  }catch(e){
    console.error('/api/rooms/:id/persons', e);
    res.status(500).json({ ok:false, message:e.code || 'Server error' });
  }
});

// ===== POST /api/persons — thêm cư dân mới =====
app.post('/api/persons', async (req, res) => {
  try {
    const {
      full_name, cccd, ethnicity, occupation, dob, hometown,
      relation_to_head, phone, room_id
    } = req.body || {};

    if (!full_name || !room_id) {
      return res.status(400).json({ ok:false, message:'Thiếu full_name hoặc room_id' });
    }

    const sql = `
      INSERT INTO persons
      (full_name, cccd, ethnicity, occupation, dob, hometown,
       relation_to_head, phone, room_id, created_at)
      VALUES (?,?,?,?,?,?,?,?,?, NOW())
    `;
    const vals = [
      full_name || null,
      cccd || null,
      ethnicity || null,
      occupation || null,
      dob || null,
      hometown || null,
      relation_to_head || null,
      phone || null,
      Number(room_id)
    ];
    const [r] = await pool.query(sql, vals);

    const [[row]] = await pool.query(
      `SELECT * FROM persons WHERE id=? LIMIT 1`, [r.insertId]
    );
    res.json({ ok:true, resident: row });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok:false, message:'CCCD đã tồn tại' });
    }
    console.error('POST /api/persons', e);
    res.status(500).json({ ok:false, message: e.code || 'Server error' });
  }
});

// ===== PUT /api/rooms/:id — cập nhật phòng =====
app.put('/api/rooms/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const allowed = [
      'room_no','room_type','status','contract_start','contract_end',
      'occupants_count','user_id'
    ];
    const sets = [];
    const vals = [];

    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) {
        sets.push(`${k} = ?`);
        vals.push(req.body[k] === '' ? null : req.body[k]);
      }
    }
    if (sets.length === 0) {
      return res.status(400).json({ ok:false, message:'Không có trường nào để cập nhật' });
    }

    vals.push(id);
    const sql = `UPDATE rooms SET ${sets.join(', ')}, created_at = created_at WHERE id = ?`;
    await pool.query(sql, vals);

    const [[room]] = await pool.query(`SELECT * FROM rooms WHERE id=? LIMIT 1`, [id]);
    res.json({ ok:true, room });
  } catch (e) {
    console.error('PUT /api/rooms/:id', e);
    res.status(500).json({ ok:false, message: e.code || 'Server error' });
  }
});

// ===== POST /api/rooms — bundle tạo user + room (+ person nếu role=user) =====
app.post('/api/rooms', async (req, res) => {
  const {
    room_no, room_type, status, contract_start, contract_end, occupants_count,
    username, password, phone, email, full_name, role, person_data
  } = req.body || {};

  try {
    // Validate
    if (!room_no) return res.status(400).json({ ok:false, message:'Thiếu room_no' });
    if (!username || !password || !full_name || !role)
      return res.status(400).json({ ok:false, message:'Thiếu thông tin tài khoản (username/password/full_name/role)' });
    if (!isDateLike(contract_start) || !isDateLike(contract_end))
      return res.status(400).json({ ok:false, message:'Ngày HĐ phải dạng YYYY-MM-DD' });
    if (role !== 'user' && role !== 'admin')
      return res.status(400).json({ ok:false, message:'role phải là user hoặc admin' });
    if (role === 'user') {
      if (!person_data || !person_data.full_name)
        return res.status(400).json({ ok:false, message:'Thiếu họ tên chủ hộ (person_data.full_name)' });
      if (!isDateLike(person_data.dob))
        return res.status(400).json({ ok:false, message:'Ngày sinh chủ hộ phải dạng YYYY-MM-DD' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1) Tạo user (có email)
      const [userRes] = await conn.query(
        `INSERT INTO users (username, password_hash, phone, email, full_name, role, created_at, person_id)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NULL)`,
        [username, password, nz(phone), nz(email), full_name, role]
      );
      const userId = userRes.insertId;

      // 2) Tạo room và gán user_id
      const [roomRes] = await conn.query(
        `INSERT INTO rooms
           (room_no, room_type, status, contract_start, contract_end, occupants_count, user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          room_no,
          nz(room_type),
          nz(status),
          nz(contract_start),
          nz(contract_end),
          nzNum(occupants_count),
          userId
        ]
      );
      const roomId = roomRes.insertId;

      // 3) Nếu role = user → tạo persons & cập nhật users.person_id
      let personId = null;
      if (role === 'user') {
        const p = person_data || {};
        const [pRes] = await conn.query(
          `INSERT INTO persons
             (full_name, cccd, ethnicity, occupation, dob, hometown, relation_to_head, phone, room_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            p.full_name,
            nz(p.cccd),
            nz(p.ethnicity),
            nz(p.occupation),
            nz(p.dob),
            nz(p.hometown),
            nz(p.relation_to_head || 'Chủ hộ'),
            nz(p.phone),
            roomId
          ]
        );
        personId = pRes.insertId;
        await conn.query(`UPDATE users SET person_id = ? WHERE id = ?`, [personId, userId]);
      }

      await conn.commit();

      // Lấy lại room để trả về
      const [[room]] = await conn.query(
        `SELECT r.*,
                (SELECT full_name FROM persons ph
                  WHERE ph.room_id = r.id AND (ph.relation_to_head='Chủ hộ' OR ph.relation_to_head='chu_ho')
                  ORDER BY ph.id LIMIT 1) AS head_name,
                (SELECT phone FROM persons ph
                  WHERE ph.room_id = r.id AND (ph.relation_to_head='Chủ hộ' OR ph.relation_to_head='chu_ho')
                  ORDER BY ph.id LIMIT 1) AS head_phone
           FROM rooms r
          WHERE r.id = ?
          LIMIT 1`, [roomId]
      );

      conn.release();
      return res.json({ ok:true, room, user_id: userId, person_id: personId });

    } catch (err) {
      await conn.rollback();
      conn.release();
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ ok:false, message:'Giá trị trùng lặp (username hoặc room_no đã tồn tại)' });
      }
      console.error('POST /api/rooms bundle', err);
      return res.status(500).json({ ok:false, message: err.code || 'Server error' });
    }
  } catch (e) {
    console.error('POST /api/rooms outer', e);
    return res.status(500).json({ ok:false, message: e.code || 'Server error' });
  }
});

// server.js  (thêm dưới nhóm /api/persons)
app.post('/api/persons/bulk_delete', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
    if (!ids.length) return res.status(400).json({ ok:false, message:'Danh sách ids trống' });

    // Chỉ cho phép xoá nếu KHÔNG là Chủ hộ (ràng buộc ở server để chắc chắn)
    const [r] = await pool.query(
      `DELETE FROM persons
       WHERE id IN (?) AND (relation_to_head IS NULL OR relation_to_head <> 'Chủ hộ')`,
      [ids]
    );
    res.json({ ok:true, deleted: r.affectedRows });
  } catch (e) {
    console.error('POST /api/persons/bulk_delete', e);
    res.status(500).json({ ok:false, message:e.code || 'Server error' });
  }
});
// DELETE /api/rooms/:id — xoá phòng + toàn bộ cư dân + tài khoản chủ hộ (nếu có)
app.delete('/api/rooms/:id', async (req, res) => {
  const roomId = Number(req.params.id);
  if (!Number.isFinite(roomId)) return res.status(400).json({ ok:false, message:'room id không hợp lệ' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lấy thông tin phòng + user_id (tài khoản gắn phòng)
    const [[room]] = await conn.query(`SELECT id, user_id FROM rooms WHERE id=? LIMIT 1`, [roomId]);
    if (!room) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ ok:false, message:'Room not found' });
    }

    const userId = room.user_id ?? null;

    // Nếu có tài khoản gắn phòng → tách liên kết & tách person_id trước khi xoá để tránh FK
    if (userId) {
      await conn.query(`UPDATE users SET person_id = NULL WHERE id = ?`, [userId]);
      await conn.query(`UPDATE rooms SET user_id = NULL WHERE id = ?`, [roomId]);
    }

    // Xoá toàn bộ cư dân thuộc phòng (bao gồm cả Chủ hộ)
    await conn.query(`DELETE FROM persons WHERE room_id = ?`, [roomId]);

    // Xoá phòng
    await conn.query(`DELETE FROM rooms WHERE id = ?`, [roomId]);

    // Xoá tài khoản (nếu tồn tại)
    if (userId) {
      await conn.query(`DELETE FROM users WHERE id = ?`, [userId]);
    }

    await conn.commit();
    conn.release();
    return res.json({ ok:true, room_id: roomId, user_deleted: !!userId });
  } catch (e) {
    await conn.rollback();
    conn.release();
    console.error('DELETE /api/rooms/:id', e);
    return res.status(500).json({ ok:false, message: e.code || 'Server error' });
  }
});

// ====== Start ======
const PORT = 5000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
