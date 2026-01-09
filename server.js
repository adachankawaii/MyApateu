// server.js - BlueMoon API Server (MVC Architecture)

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

// Database
const { checkConnection } = require('./src/infrastructure/db/dbConnector');

// API Router
const apiRouter = require('./src/application/api/ApiRouter');

// Middleware
const { errorHandler, notFoundHandler } = require('./src/application/middleware/ErrorMiddleware');

const app = express();

// ===============================
// CORS + body parser + static
// ===============================
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5000',
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===============================
// Session
// ===============================
app.use(session({
  name: 'bluemoon.sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8 // 8 hours
  }
}));

// ===============================
// DB Check on Startup
// ===============================
checkConnection();

// ===============================
// Routes
// ===============================

// Root route
app.get('/', (req, res) => res.send('BlueMoon API is running'));

// DB Check endpoint
app.get('/api/dbcheck', async (req, res) => {
  try {
    const { pool } = require('./src/infrastructure/db/dbConnector');
    const [r] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, db: r[0].ok === 1 });
  } catch (e) {
    console.error('/api/dbcheck', e);
    res.status(500).json({ ok: false, message: e.code || 'DB failed' });
  }
});

// API Routes
app.use('/api', apiRouter);

// ===============================
// Error Handling
// ===============================

// 404 handler for API routes
app.use('/api', notFoundHandler);

// Global error handler
app.use(errorHandler);

// ===============================
// Start Server
// ===============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] BlueMoon API listening on http://localhost:${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
