// dbConnector.js - Database connection pool

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'aduser',
  password: process.env.DB_PASSWORD || 'lienquan123!',
  database: process.env.DB_NAME || 'bluedb',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_LIMIT) || 5,
  charset: 'utf8mb4'
});

// Kiểm tra kết nối khi khởi động
const checkConnection = async () => {
  try {
    const [r] = await pool.query('SELECT 1 AS ok');
    console.log('[DB] connected =', r[0].ok === 1);
    return true;
  } catch (e) {
    console.error('[DB] connect error:', e.code || e.message);
    return false;
  }
};

module.exports = { pool, checkConnection };
