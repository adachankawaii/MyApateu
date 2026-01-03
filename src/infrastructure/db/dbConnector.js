// src/infrastructure/db/dbConnector.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4'
});

async function dbSanityCheck() {
  try {
    const [r] = await pool.query('SELECT 1 AS ok');
    console.log('[DB] connected =', r[0].ok === 1);
  } catch (e) {
    console.error('[DB] connect error:', e.code || e.message);
  }
}

module.exports = { pool, dbSanityCheck };
