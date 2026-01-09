// ParkingRepositoryImpl.js - Vehicles & Parking Repository

const IRepository = require('./IRepository');
const { pool } = require('../db/dbConnector');

class ParkingRepositoryImpl extends IRepository {
  /**
   * Tìm tất cả vehicles với bộ lọc
   */
  async findAll(filters = {}) {
    const { q, room_id, parking_status } = filters;
    const where = [];
    const vals = [];

    if (room_id) {
      where.push('v.room_id = ?');
      vals.push(this._toNum(room_id));
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
      const lp = this._likeParam(q);
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
    return rows;
  }

  /**
   * Tìm vehicle theo ID
   */
  async findById(id) {
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
    return rows[0] || null;
  }

  /**
   * Tạo vehicle mới
   */
  async create(data) {
    const [ins] = await pool.query(
      `INSERT INTO vehicles
        (room_id, person_id, plate, vehicle_type, brand, model, color,
         parking_status, parking_slot, last_checkin, last_checkout,
         parking_fee_total, created_at)
       VALUES (?,?,?,?,?,?,?,?,NULL,NULL,NULL,0, NOW())`,
      [
        this._toNum(data.room_id),
        this._toNum(data.person_id),
        data.plate,
        data.vehicle_type || 'MOTORBIKE',
        data.brand || null,
        data.model || null,
        data.color || null,
        'OUT'
      ]
    );

    const [[vehicle]] = await pool.query(`SELECT * FROM vehicles WHERE id = ?`, [ins.insertId]);
    return vehicle;
  }

  /**
   * Cập nhật vehicle
   */
  async update(id, data) {
    const allowed = ['room_id', 'person_id', 'plate', 'vehicle_type', 'brand',
      'model', 'color', 'parking_status', 'parking_slot'];
    const sets = [];
    const vals = [];

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sets.push(`${key} = ?`);
        if (key === 'room_id' || key === 'person_id') vals.push(this._toNum(data[key]));
        else vals.push(data[key] === '' ? null : data[key]);
      }
    }

    if (!sets.length) return null;

    vals.push(id);
    await pool.query(`UPDATE vehicles SET ${sets.join(', ')} WHERE id = ?`, vals);

    const [[vehicle]] = await pool.query(`SELECT * FROM vehicles WHERE id = ?`, [id]);
    return vehicle;
  }

  /**
   * Xóa vehicle và fees liên quan
   */
  async delete(id, billingRepository) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[vehicle]] = await conn.query(
        `SELECT id FROM vehicles WHERE id = ? LIMIT 1 FOR UPDATE`, [id]
      );
      if (!vehicle) {
        await conn.rollback();
        return false;
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
      return true;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  /**
   * Check-in xe
   */
  async checkin(id, parkingSlot) {
    await pool.query(
      `UPDATE vehicles
       SET parking_status = 'IN',
           parking_slot = ?,
           last_checkin = NOW(),
           last_checkout = NULL
       WHERE id = ?`,
      [parkingSlot || null, id]
    );

    const [[vehicle]] = await pool.query(`SELECT * FROM vehicles WHERE id = ?`, [id]);
    return vehicle;
  }

  /**
   * Check-out xe và tạo phí
   */
  async checkout(id, feeData) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[vehicle]] = await conn.query(
        `SELECT * FROM vehicles WHERE id = ? LIMIT 1 FOR UPDATE`, [id]
      );
      if (!vehicle) {
        await conn.rollback();
        return null;
      }

      const price = Number(feeData.unit_price || 0);
      const qty = Number(feeData.quantity || 1);
      const total = Math.round(price * qty * 100) / 100;

      await conn.query(
        `UPDATE vehicles
         SET parking_status = 'OUT',
             last_checkout = NOW(),
             parking_fee_total = parking_fee_total + ?
         WHERE id = ?`,
        [total, id]
      );

      const [fRes] = await conn.query(
        `INSERT INTO fees
          (room_id, person_id, vehicle_id,
           fee_name, fee_type, period,
           quantity, unit_price, amount_due,
           amount_paid, due_date, status, note, created_at)
         VALUES (?,?,?,?,?,NULL,?,?,?,0,CURDATE(),'UNPAID',NULL, NOW())`,
        [
          vehicle.room_id,
          vehicle.person_id,
          id,
          feeData.fee_name || 'Phí gửi xe',
          'PARKING',
          qty,
          price,
          total
        ]
      );

      await conn.commit();

      const [[fee]] = await pool.query(`SELECT * FROM fees WHERE id = ?`, [fRes.insertId]);
      return { vehicle_id: id, fee };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  /**
   * Thống kê parking
   */
  async getStatistics(from, to) {
    const conn = await pool.getConnection();
    try {
      // Tổng quan
      const summarySql = `
        SELECT
          COUNT(*) AS total_fees,
          SUM(f.amount_due) AS total_amount_due,
          SUM(f.amount_paid) AS total_amount_paid
        FROM fees f
        WHERE f.fee_type = 'PARKING'
          AND f.created_at >= ? AND f.created_at < DATE_ADD(?, INTERVAL 1 DAY)
      `;
      const [summaryRows] = await conn.query(summarySql, [from, to]);

      // Theo status
      const byStatusSql = `
        SELECT f.status, COUNT(*) AS cnt,
               SUM(f.amount_due) AS amount_due,
               SUM(f.amount_paid) AS amount_paid
        FROM fees f
        WHERE f.fee_type = 'PARKING'
          AND f.created_at >= ? AND f.created_at < DATE_ADD(?, INTERVAL 1 DAY)
        GROUP BY f.status
      `;
      const [statusRows] = await conn.query(byStatusSql, [from, to]);

      // Theo ngày
      const byDaySql = `
        SELECT
          DATE(f.created_at) AS day,
          COUNT(*) AS total_fees,
          SUM(f.amount_due) AS total_amount_due,
          SUM(f.amount_paid) AS total_amount_paid
        FROM fees f
        WHERE f.fee_type = 'PARKING'
          AND f.created_at >= ? AND f.created_at < DATE_ADD(?, INTERVAL 1 DAY)
        GROUP BY DATE(f.created_at)
        ORDER BY day ASC
      `;
      const [dayRows] = await conn.query(byDaySql, [from, to]);

      return {
        summary: summaryRows[0] || { total_fees: 0, total_amount_due: 0, total_amount_paid: 0 },
        by_status: statusRows,
        by_day: dayRows
      };
    } finally {
      conn.release();
    }
  }

  /**
   * Lấy xe đang trong bãi
   */
  async getVehiclesInLot(filters = {}) {
    const { room_id, q } = filters;
    const where = [`v.parking_status = 'IN'`];
    const vals = [];

    if (room_id) {
      where.push('v.room_id = ?');
      vals.push(this._toNum(room_id));
    }
    if (q) {
      where.push(`(
        v.plate LIKE ? ESCAPE '\\\\' OR
        p.full_name LIKE ? ESCAPE '\\\\' OR
        r.room_no LIKE ? ESCAPE '\\\\'
      )`);
      const lp = this._likeParam(q);
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
      WHERE ${where.join(' AND ')}
      ORDER BY v.parking_slot ASC, v.plate ASC
    `;
    const [rows] = await pool.query(sql, vals);
    return rows;
  }

  // Helpers
  _likeParam(s) {
    return `%${(s || '').replace(/[%_]/g, '\\$&')}%`;
  }

  _toNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
}

module.exports = new ParkingRepositoryImpl();
