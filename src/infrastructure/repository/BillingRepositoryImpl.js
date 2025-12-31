// BillingRepositoryImpl.js - Fees & Payments Repository

const IRepository = require('./IRepository');
const { pool } = require('../db/dbConnector');

class BillingRepositoryImpl extends IRepository {
  // =============== FEES ===============

  /**
   * Tìm tất cả fees với bộ lọc và phân trang
   */
  async findAllFees(filters = {}) {
    const { q, fee_type, status, period, room_id, vehicle_id, page = 1, page_size = 20 } = filters;
    const offset = (page - 1) * page_size;

    let where = '1=1';
    const params = [];

    if (q) {
      where += ` AND (
        f.fee_name LIKE ? ESCAPE '\\\\' OR
        r.room_no LIKE ? ESCAPE '\\\\' OR
        v.plate LIKE ? ESCAPE '\\\\'
      )`;
      const lp = this._likeParam(q);
      params.push(lp, lp, lp);
    }
    if (fee_type) {
      where += ' AND f.fee_type = ?';
      params.push(fee_type);
    }
    if (status) {
      where += ' AND f.status = ?';
      params.push(status);
    }
    if (period) {
      where += ' AND f.period = ?';
      params.push(period);
    }
    if (room_id) {
      where += ' AND f.room_id = ?';
      params.push(room_id);
    }
    if (vehicle_id) {
      where += ' AND f.vehicle_id = ?';
      params.push(vehicle_id);
    }

    const sqlCount = `
      SELECT COUNT(*) AS cnt
      FROM fees f
      LEFT JOIN rooms r ON r.id = f.room_id
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
      LEFT JOIN rooms r ON r.id = f.room_id
      LEFT JOIN vehicles v ON v.id = f.vehicle_id
      WHERE ${where}
      ORDER BY f.created_at DESC
      LIMIT ?, ?
    `;

    const [countRows] = await pool.query(sqlCount, params);
    const dataParams = [...params, offset, page_size];
    const [rows] = await pool.query(sqlData, dataParams);

    return {
      items: rows,
      total: countRows[0]?.cnt || 0,
      page,
      page_size
    };
  }

  /**
   * Tìm fee theo ID
   */
  async findFeeById(id) {
    const [rows] = await pool.query(`
      SELECT f.*, r.room_no, v.plate
      FROM fees f
      LEFT JOIN rooms r ON r.id = f.room_id
      LEFT JOIN vehicles v ON v.id = f.vehicle_id
      WHERE f.id = ?
      LIMIT 1
    `, [id]);
    return rows[0] || null;
  }

  /**
   * Tạo fee mới
   */
  async createFee(data) {
    const qty = Number(data.quantity ?? 1);
    const price = Number(data.unit_price ?? 0);
    const total = Math.round(qty * price * 100) / 100;

    const [ins] = await pool.query(
      `INSERT INTO fees
        (room_id, person_id, vehicle_id,
         fee_name, fee_type, period,
         quantity, unit_price, amount_due,
         amount_paid, due_date, status, note, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?, NOW())`,
      [
        this._toNum(data.room_id),
        this._toNum(data.person_id),
        this._toNum(data.vehicle_id),
        data.fee_name,
        data.fee_type || 'ROOM',
        data.period || null,
        qty,
        price,
        total,
        data.due_date || null,
        data.status || 'UNPAID',
        data.note || null
      ]
    );

    const [[fee]] = await pool.query(`SELECT * FROM fees WHERE id = ?`, [ins.insertId]);
    return fee;
  }

  /**
   * Cập nhật fee
   */
  async updateFee(id, data) {
    const fields = [];
    const params = [];

    const setField = (col, val) => {
      fields.push(`${col} = ?`);
      params.push(val);
    };

    if ('room_id' in data) setField('room_id', this._toNum(data.room_id));
    if ('person_id' in data) setField('person_id', this._toNum(data.person_id));
    if ('vehicle_id' in data) setField('vehicle_id', this._toNum(data.vehicle_id));
    if ('fee_name' in data) setField('fee_name', data.fee_name || null);
    if ('fee_type' in data) setField('fee_type', data.fee_type || 'ROOM');
    if ('period' in data) setField('period', data.period || null);
    if ('quantity' in data) setField('quantity', Number(data.quantity));
    if ('unit_price' in data) setField('unit_price', Number(data.unit_price));
    if ('amount_due' in data) setField('amount_due', Number(data.amount_due));
    if ('amount_paid' in data) setField('amount_paid', Number(data.amount_paid));
    if ('due_date' in data) setField('due_date', data.due_date || null);
    if ('status' in data) setField('status', data.status || 'UNPAID');
    if ('note' in data) setField('note', data.note || null);

    if (!fields.length) return null;

    params.push(id);
    await pool.query(`UPDATE fees SET ${fields.join(', ')} WHERE id = ?`, params);

    const [[fee]] = await pool.query(`SELECT * FROM fees WHERE id = ?`, [id]);
    return fee;
  }

  /**
   * Xóa fee và payments liên quan
   */
  async deleteFee(id) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[fee]] = await conn.query(`SELECT id FROM fees WHERE id = ? LIMIT 1 FOR UPDATE`, [id]);
      if (!fee) {
        await conn.rollback();
        return false;
      }

      await conn.query(`DELETE FROM payments WHERE fee_id = ?`, [id]);
      await conn.query(`DELETE FROM fees WHERE id = ?`, [id]);

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
   * Xóa fees theo vehicle_id
   */
  async deleteFeesByVehicleId(vehicleId) {
    const [feeRows] = await pool.query(`SELECT id FROM fees WHERE vehicle_id = ?`, [vehicleId]);
    const feeIds = feeRows.map(r => r.id);
    if (feeIds.length) {
      await pool.query(`DELETE FROM payments WHERE fee_id IN (?)`, [feeIds]);
      await pool.query(`DELETE FROM fees WHERE id IN (?)`, [feeIds]);
    }
    return feeIds.length;
  }

  // =============== PAYMENTS ===============

  /**
   * Tìm payments theo fee_id
   */
  async findPaymentsByFeeId(feeId) {
    const [rows] = await pool.query(`
      SELECT p.*, u.full_name AS created_by_name
      FROM payments p
      LEFT JOIN users u ON u.id = p.user_id
      WHERE p.fee_id = ?
      ORDER BY p.payment_date DESC
    `, [feeId]);
    return rows;
  }

  /**
   * Tạo payment và cập nhật fee
   */
  async createPayment(data, userId) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[fee]] = await conn.query(
        `SELECT id, amount_due, amount_paid, status FROM fees WHERE id = ? FOR UPDATE`,
        [data.fee_id]
      );
      if (!fee) {
        await conn.rollback();
        return null;
      }

      const newPaid = Math.round((fee.amount_paid + data.amount) * 100) / 100;
      let newStatus = fee.status;
      if (newPaid <= 0) newStatus = 'UNPAID';
      else if (newPaid < fee.amount_due) newStatus = 'PARTIAL';
      else newStatus = 'PAID';

      const [ins] = await conn.query(
        `INSERT INTO payments
          (fee_id, user_id, payment_date, amount, method, note, created_at)
         VALUES (?,?,NOW(),?,?,?, NOW())`,
        [data.fee_id, userId || null, data.amount, data.method || 'CASH', data.note || null]
      );

      await conn.query(
        `UPDATE fees SET amount_paid = ?, status = ? WHERE id = ?`,
        [newPaid, newStatus, data.fee_id]
      );

      await conn.commit();

      const [[payment]] = await pool.query(`SELECT * FROM payments WHERE id = ?`, [ins.insertId]);
      return { payment, fee_id: data.fee_id, new_status: newStatus, new_amount_paid: newPaid };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
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

module.exports = new BillingRepositoryImpl();
