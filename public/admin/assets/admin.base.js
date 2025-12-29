const THEME_KEY = "bm_theme";
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  applyTheme(saved);
}
function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  applyTheme(current === "light" ? "dark" : "light");
}

const API_BASE = "/api";
async function getJSON(path) {
  const res = await fetch(API_BASE + path, { credentials: "include" });
  return res.json();
}
async function postJSON(path, body) {
  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  return res.json();
}

const ROUTES = {
  home: "../index.html",
  residents: "./residents.html",
  parking: "./parking.html",
  bills: "./bills.html",
};

initTheme();
