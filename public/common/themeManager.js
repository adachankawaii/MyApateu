// themeManager.js - Theme Management for frontend

const THEME_KEY = 'bluemoon_theme';

/**
 * Theme management object
 */
const theme = {
  /**
   * Lấy theme hiện tại
   */
  get() {
    try {
      return localStorage.getItem(THEME_KEY) || 'light';
    } catch (e) {
      return 'light';
    }
  },

  /**
   * Set theme
   */
  set(themeName) {
    try {
      localStorage.setItem(THEME_KEY, themeName);
      this.apply(themeName);
    } catch (e) {
      console.error('Theme set error:', e);
    }
  },

  /**
   * Áp dụng theme vào document
   */
  apply(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeName === 'dark' ? '#0f172a' : '#3b82f6');
    }
  },

  /**
   * Toggle theme
   */
  toggle() {
    const current = this.get();
    const next = current === 'dark' ? 'light' : 'dark';
    this.set(next);
    return next;
  },

  /**
   * Khởi tạo theme từ localStorage hoặc system preference
   */
  init() {
    let savedTheme = this.get();

    // Nếu chưa có theme saved, dùng system preference
    if (!localStorage.getItem(THEME_KEY)) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      savedTheme = prefersDark ? 'dark' : 'light';
    }

    this.apply(savedTheme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only update if user hasn't set a preference
      if (!localStorage.getItem(THEME_KEY)) {
        this.apply(e.matches ? 'dark' : 'light');
      }
    });
  },

  /**
   * Check if dark mode
   */
  isDark() {
    return this.get() === 'dark';
  }
};

// Auto-init on load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => theme.init());
  } else {
    theme.init();
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = theme;
}

// Make available globally
window.theme = theme;
