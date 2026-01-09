// sessionClient.js - Session Management for frontend

const SESSION_KEY = 'bluemoon_session';

/**
 * Session management object
 */
const session = {
  /**
   * Lưu thông tin session
   */
  save(userData) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        id: userData.id,
        username: userData.username,
        role: userData.role,
        person_id: userData.person_id,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Session save error:', e);
    }
  },

  /**
   * Lấy thông tin session
   */
  get() {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      if (!data) return null;

      const session = JSON.parse(data);
      // Session hết hạn sau 8 tiếng
      const maxAge = 8 * 60 * 60 * 1000;
      if (Date.now() - session.timestamp > maxAge) {
        this.clear();
        return null;
      }
      return session;
    } catch (e) {
      console.error('Session get error:', e);
      return null;
    }
  },

  /**
   * Xóa session
   */
  clear() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.error('Session clear error:', e);
    }
  },

  /**
   * Kiểm tra đã đăng nhập chưa
   */
  isAuthenticated() {
    return this.get() !== null;
  },

  /**
   * Verify session với server
   * Kiểm tra session có hợp lệ trên server không
   */
  async verifyWithServer() {
    try {
      const response = await fetch('/api/check-session', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (!data.ok || !data.authenticated) {
        // Session không hợp lệ trên server, xóa local session
        this.clear();
        return false;
      }
      
      // Cập nhật session local nếu cần
      const localSession = this.get();
      if (localSession && localSession.id !== data.userId) {
        // Local session không khớp với server, xóa và yêu cầu đăng nhập lại
        console.warn('[Session] Local session mismatch, clearing...', {local: localSession.id, server: data.userId});
        this.clear();
        return false;
      }
      
      return true;
    } catch (e) {
      console.error('Session verify error:', e);
      return false;
    }
  },

  /**
   * Kiểm tra có phải admin không
   */
  isAdmin() {
    const session = this.get();
    return session && session.role === 'ADMIN';
  },

  /**
   * Kiểm tra có phải resident không
   */
  isResident() {
    const session = this.get();
    return session && session.role === 'RESIDENT';
  },

  /**
   * Redirect nếu chưa đăng nhập
   * Có thể kiểm tra với server (async)
   */
  requireAuth(redirectUrl = '/index.html', verifyServer = false) {
    if (!this.isAuthenticated()) {
      window.location.href = redirectUrl;
      return false;
    }
    
    if (verifyServer) {
      // Async check với server
      this.verifyWithServer().then(valid => {
        if (!valid) {
          window.location.href = redirectUrl;
        }
      });
    }
    
    return true;
  },

  /**
   * Redirect nếu chưa đăng nhập (async version)
   * Luôn kiểm tra với server
   */
  async requireAuthAsync(redirectUrl = '/index.html') {
    if (!this.isAuthenticated()) {
      window.location.href = redirectUrl;
      return false;
    }
    
    const valid = await this.verifyWithServer();
    if (!valid) {
      window.location.href = redirectUrl;
      return false;
    }
    
    return true;
  },

  /**
   * Redirect nếu không phải admin
   */
  requireAdmin(redirectUrl = '/index.html') {
    if (!this.isAdmin()) {
      window.location.href = redirectUrl;
      return false;
    }
    return true;
  },

  /**
   * Logout và redirect
   */
  async logout(redirectUrl = '/index.html') {
    try {
      await api.logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    this.clear();
    window.location.href = redirectUrl;
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = session;
}

// Make available globally
window.session = session;
