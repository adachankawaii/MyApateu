// AuthService.js - Authentication Service

const authRepository = require('../../infrastructure/repository/AuthRepositoryImpl');

class AuthService {
  /**
   * Xác thực người dùng
   * @param {string} username
   * @param {string} password
   * @returns {Promise<Object|null>}
   */
  async authenticate(username, password) {
    if (!username || !password) {
      return { success: false, message: 'Thiếu tài khoản hoặc mật khẩu' };
    }

    const user = await authRepository.findByUsername(username);
    
    // Lưu ý: đang so sánh plain text, thực tế nên dùng bcrypt
    if (!user || user.password_hash !== password) {
      return { success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        person_id: user.person_id
      }
    };
  }

  /**
   * Lấy thông tin người dùng hiện tại
   * @param {number} userId
   * @returns {Promise<Object|null>}
   */
  async getCurrentUser(userId) {
    const user = await authRepository.findById(userId);
    if (!user) return null;
    return user;
  }

  /**
   * Tạo người dùng mới
   * @param {Object} userData
   * @returns {Promise<Object>}
   */
  async createUser(userData) {
    return authRepository.create(userData);
  }

  /**
   * Cập nhật người dùng
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateUser(id, data) {
    return authRepository.update(id, data);
  }

  /**
   * Lấy thông tin tòa nhà
   * @returns {Object}
   */
  getBuildingInfo() {
    return {
      name: 'Chung cư BlueMoon',
      code: 'A1',
      address: 'Số 01 Đường Trăng Xanh, Quận M, Hà Nội',
      manager: 'Ban quản lý BlueMoon',
      contact: '0123 456 789 • bql@bluemoon.vn'
    };
  }
}

module.exports = new AuthService();
