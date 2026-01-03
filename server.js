// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const apiRouter = require('./src/application/api/ApiRouter');

// dbSanityCheck là tuỳ chọn (có thì gọi, không có thì bỏ qua)
const db = require('./src/infrastructure/db/dbConnector');
const dbSanityCheck = db.dbSanityCheck;

// Error middleware (tuỳ chọn)
let errorMiddleware = null;
try {
  errorMiddleware = require('./src/application/middleware/ErrorMiddleware');
} catch (_) {
  // nếu bạn chưa tạo file ErrorMiddleware.js thì bỏ qua
}

const app = express();

// Middleware chung
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(
  session({
    name: 'bluemoon.sid',
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

// (Tuỳ chọn) check DB lúc start
if (typeof dbSanityCheck === 'function') dbSanityCheck();

// Route root (tuỳ chọn)
app.get('/', (_req, res) => res.send('BlueMoon API is running'));

// Mount toàn bộ API routes (các controller đã dùng sẵn prefix "/api/...")
app.use(apiRouter);

// Error handler cuối cùng (tuỳ chọn)
if (typeof errorMiddleware === 'function') app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
