// DomainUtils.js - Shared utility functions for domain layer

/**
 * Chuyển đổi giá trị sang số, trả về null nếu không hợp lệ
 */
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Tạo tham số LIKE cho SQL query
 */
function likeParam(s) {
  return `%${(s || '').replace(/[%_]/g, '\\$&')}%`;
}

/**
 * Kiểm tra định dạng ngày YYYY-MM-DD
 */
function isDateLike(s) {
  return !s || /^\d{4}-\d{2}-\d{2}$/.test(String(s));
}

/**
 * Format số tiền theo VND
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount || 0);
}

/**
 * Parse period string (YYYY-MM) thành object { year, month }
 */
function parsePeriod(period) {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return null;
  const [year, month] = period.split('-').map(Number);
  return { year, month };
}

/**
 * Tạo period string từ Date
 */
function createPeriod(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Sanitize string để tránh XSS
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Tính trạng thái fee dựa trên amount_paid và amount_due
 */
function calculateFeeStatus(amountPaid, amountDue) {
  if (amountPaid <= 0) return 'UNPAID';
  if (amountPaid < amountDue) return 'PARTIAL';
  return 'PAID';
}

module.exports = {
  toNum,
  likeParam,
  isDateLike,
  formatCurrency,
  parsePeriod,
  createPeriod,
  sanitizeString,
  calculateFeeStatus
};
