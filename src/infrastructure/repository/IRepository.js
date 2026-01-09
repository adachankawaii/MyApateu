// IRepository.js - Base Repository Interface

/**
 * Interface cơ sở cho các Repository
 * Định nghĩa các phương thức CRUD chung
 */
class IRepository {
  /**
   * Tìm tất cả bản ghi
   * @param {Object} filters - Điều kiện lọc
   * @returns {Promise<Array>}
   */
  async findAll(filters = {}) {
    throw new Error('Method findAll() must be implemented');
  }

  /**
   * Tìm bản ghi theo ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    throw new Error('Method findById() must be implemented');
  }

  /**
   * Tạo bản ghi mới
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    throw new Error('Method create() must be implemented');
  }

  /**
   * Cập nhật bản ghi
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    throw new Error('Method update() must be implemented');
  }

  /**
   * Xóa bản ghi
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    throw new Error('Method delete() must be implemented');
  }
}

module.exports = IRepository;
