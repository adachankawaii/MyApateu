// ResidentRepositoryImpl.js - Resident (Rooms & Persons) Repository

const IRepository = require('./IRepository');
const { pool } = require('../db/dbConnector');

class ResidentRepositoryImpl extends IRepository {
  // =============== ROOMS ===============

  /**
   * Tìm tất cả phòng với bộ lọc
   * @param {Object} filters - { q, status, room_type }
   */
  async findAllRooms(filters = {}) {
    const { q, status, room_type } = filters;

    let sql = `
      SELECT
        r.*,
        h.full_name AS head_name,
        h.phone AS head_phone,
        COALESCE(cnt.cnt, 0) AS occupants_count_calc
      FROM rooms r
      LEFT JOIN persons h ON h.room_id = r.id AND h.relation_to_head = 'Chủ hộ'
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
    return rows;
  }

  /**
   * Tìm phòng theo ID
   */
  async findRoomById(id) {
    const [rows] = await pool.query(`
      SELECT
        r.id, r.room_no, r.building, r.floor, r.room_type,
        r.area_m2, r.status, r.contract_start, r.contract_end,
        r.note, r.created_at,
        (SELECT p.full_name FROM persons p WHERE p.room_id = r.id AND p.is_head = 1 ORDER BY p.id LIMIT 1) AS head_name,
        (SELECT p.phone FROM persons p WHERE p.room_id = r.id AND p.is_head = 1 ORDER BY p.id LIMIT 1) AS head_phone,
        (SELECT COUNT(*) FROM persons p WHERE p.room_id = r.id) AS occupants_count
      FROM rooms r
      WHERE r.id = ?
      LIMIT 1
    `, [id]);

    return rows[0] || null;
  }

  /**
   * Tạo phòng mới (có thể kèm chủ hộ + user)
   */
  async createRoom(roomData, personData = null, userData = null) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1) Tạo phòng
      const [roomResult] = await conn.query(
        `INSERT INTO rooms
          (room_no, building, floor, room_type, area_m2, status,
           contract_start, contract_end, note, created_at)
         VALUES (?, NULL, NULL, ?, NULL, ?, ?, ?, NULL, NOW())`,
        [
          roomData.room_no,
          roomData.room_type || null,
          roomData.status || null,
          roomData.contract_start || null,
          roomData.contract_end || null
        ]
      );
      const roomId = roomResult.insertId;

      // 2) Tạo chủ hộ (person) nếu có
      let personId = null;
      if (personData && personData.full_name) {
        const isHead = (personData.relation_to_head === 'Chủ hộ') ? 1 : 0;
        const [pRes] = await conn.query(
          `INSERT INTO persons
            (room_id, full_name, cccd, ethnicity, occupation,
             dob, hometown, relation_to_head, phone, is_head, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            roomId,
            personData.full_name,
            personData.cccd || null,
            personData.ethnicity || null,
            personData.occupation || null,
            personData.dob || null,
            personData.hometown || null,
            personData.relation_to_head || 'Chủ hộ',
            personData.phone || null,
            isHead
          ]
        );
        personId = pRes.insertId;
      }

      // 3) Tạo user nếu có
      let userId = null;
      if (userData && userData.username && userData.password) {
        const displayName = userData.full_name || (personData && personData.full_name) || null;
        const [uRes] = await conn.query(
          `INSERT INTO users
            (username, password_hash, phone, email, full_name, role, person_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            userData.username,
            userData.password,
            userData.phone || null,
            userData.email || null,
            displayName,
            userData.role || 'RESIDENT',
            personId
          ]
        );
        userId = uRes.insertId;
      }

      await conn.commit();

      return { room_id: roomId, user_id: userId, person_id: personId };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Cập nhật phòng
   */
  async updateRoom(id, data) {
    const allowed = ['room_no', 'building', 'floor', 'room_type', 'area_m2',
      'status', 'contract_start', 'contract_end', 'note'];
    const sets = [];
    const vals = [];

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sets.push(`${key} = ?`);
        if (key === 'floor') vals.push(this._toNum(data[key]));
        else if (key === 'area_m2') vals.push(data[key] != null ? Number(data[key]) : null);
        else vals.push(data[key] === '' ? null : data[key]);
      }
    }

    if (!sets.length) return null;

    vals.push(id);
    await pool.query(`UPDATE rooms SET ${sets.join(', ')} WHERE id = ?`, vals);

    const [[room]] = await pool.query(`SELECT * FROM rooms WHERE id = ?`, [id]);
    return room;
  }

  /**
   * Xóa phòng và dữ liệu liên quan
   */
  async deleteRoom(roomId) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rooms] = await conn.query(`SELECT id FROM rooms WHERE id = ? LIMIT 1 FOR UPDATE`, [roomId]);
      if (!rooms[0]) {
        await conn.rollback();
        return false;
      }

      // Xoá payments -> fees -> vehicles -> users -> persons -> room
      const [feeRows] = await conn.query(`SELECT id FROM fees WHERE room_id = ?`, [roomId]);
      const feeIds = feeRows.map(r => r.id);
      if (feeIds.length) {
        await conn.query(`DELETE FROM payments WHERE fee_id IN (?)`, [feeIds]);
        await conn.query(`DELETE FROM fees WHERE id IN (?)`, [feeIds]);
      }

      await conn.query(`DELETE FROM vehicles WHERE room_id = ?`, [roomId]);

      const [personRows] = await conn.query(`SELECT id FROM persons WHERE room_id = ?`, [roomId]);
      const personIds = personRows.map(r => r.id);
      if (personIds.length) {
        await conn.query(`DELETE FROM users WHERE person_id IN (?)`, [personIds]);
      }

      await conn.query(`DELETE FROM persons WHERE room_id = ?`, [roomId]);
      await conn.query(`DELETE FROM rooms WHERE id = ?`, [roomId]);

      await conn.commit();
      return true;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  // =============== PERSONS ===============

  /**
   * Tìm persons theo room_id
   */
  async findPersonsByRoomId(roomId) {
    let sql = `
      SELECT id, room_id, full_name, cccd, ethnicity, occupation, dob,
             hometown, relation_to_head, phone, email, is_head, created_at
      FROM persons
    `;
    const vals = [];

    if (roomId) {
      sql += ' WHERE room_id = ?';
      vals.push(roomId);
    }

    sql += ' ORDER BY (is_head = 1) DESC, full_name ASC';

    const [rows] = await pool.query(sql, vals);
    return rows;
  }

  /**
   * Tạo person mới
   */
  async createPerson(data) {
    const [ins] = await pool.query(
      `INSERT INTO persons
        (room_id, full_name, cccd, ethnicity, occupation, dob, hometown,
         relation_to_head, phone, email, is_head, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?, NOW())`,
      [
        data.room_id,
        data.full_name,
        data.cccd || null,
        data.ethnicity || null,
        data.occupation || null,
        data.dob || null,
        data.hometown || null,
        data.relation_to_head || null,
        data.phone || null,
        data.email || null,
        data.is_head ? 1 : 0
      ]
    );

    const [[person]] = await pool.query(`SELECT * FROM persons WHERE id = ?`, [ins.insertId]);
    return person;
  }

  /**
   * Cập nhật person
   */
  async updatePerson(id, data) {
    const allowed = ['room_id', 'full_name', 'cccd', 'ethnicity', 'occupation',
      'dob', 'hometown', 'relation_to_head', 'phone', 'email', 'is_head'];
    const sets = [];
    const vals = [];

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sets.push(`${key} = ?`);
        if (key === 'room_id') vals.push(this._toNum(data[key]));
        else if (key === 'is_head') vals.push(data[key] ? 1 : 0);
        else vals.push(data[key] === '' ? null : data[key]);
      }
    }

    if (!sets.length) return null;

    vals.push(id);
    await pool.query(`UPDATE persons SET ${sets.join(', ')} WHERE id = ?`, vals);

    const [[person]] = await pool.query(`SELECT * FROM persons WHERE id = ?`, [id]);
    return person;
  }

  /**
   * Xóa nhiều persons (không phải chủ hộ)
   */
  async bulkDeletePersons(ids) {
    if (!ids.length) return 0;
    const [r] = await pool.query(
      `DELETE FROM persons WHERE id IN (?) AND is_head = 0`,
      [ids]
    );
    return r.affectedRows;
  }

  // Helper
  _toNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
}

module.exports = new ResidentRepositoryImpl();
