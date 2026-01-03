// src/domain/shared/DomainUtils.js
function likeParam(s) {
  return `%${(s || '').replace(/[%_]/g, '\\$&')}%`;
}
function isDateLike(s) {
  return !s || /^\d{4}-\d{2}-\d{2}$/.test(String(s));
}
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

module.exports = { likeParam, isDateLike, toNum };
