// AuthRepositoryImpl.js - Authentication Repository Implementation

const IRepository = require('./IRepository');
const { pool } = require('../db/dbConnector');

class AuthRepositoryImpl extends IRepository {
  /**
   * Tìm user theo username
   * @param {string} username
   * @returns {Promise<Object|null>}
   */
  async findByUsername(username) {
    const [rows] = await pool.execute(
      'SELECT id, username, password_hash, role, person_id FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    return rows[0] || null;
  }

  /**
   * Tìm user theo ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT id, username, full_name, email, phone, role, person_id, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Tạo user mới
   * @param {Object} userData
   * @returns {Promise<Object>}
   */
  async create(userData) {
    const {
      username,
      password_hash,
      phone,
      email,
      full_name,
      role,
      person_id
    } = userData;

    const [result] = await pool.query(
      `INSERT INTO users
        (username, password_hash, phone, email, full_name, role, person_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [username, password_hash, phone, email, full_name, role, person_id]
    );

    return { id: result.insertId, ...userData };
  }

  /**
   * Cập nhật user
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const allowed = ['username', 'password_hash', 'phone', 'email', 'full_name', 'role', 'person_id'];
    const sets = [];
    const vals = [];

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sets.push(`${key} = ?`);
        vals.push(data[key]);
      }
    }

    if (sets.length === 0) return null;

    vals.push(id);
    await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, vals);

    return this.findById(id);
  }

  /**
   * Xóa user theo person_id
   * @param {Array<number>} personIds
   * @returns {Promise<boolean>}
   */
  async deleteByPersonIds(personIds) {
    if (!personIds.length) return true;
    await pool.query(`DELETE FROM users WHERE person_id IN (?)`, [personIds]);
    return true;
  }
}

module.exports = new AuthRepositoryImpl();
