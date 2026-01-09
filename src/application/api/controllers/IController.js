// IController.js - Base Controller Interface

/**
 * Interface cơ sở cho các Controller
 */
class IController {
  /**
   * Lấy tất cả records
   * @param {Request} req
   * @param {Response} res
   */
  async getAll(req, res) {
    throw new Error('Method getAll() must be implemented');
  }

  /**
   * Lấy record theo ID
   * @param {Request} req
   * @param {Response} res
   */
  async getById(req, res) {
    throw new Error('Method getById() must be implemented');
  }

  /**
   * Tạo record mới
   * @param {Request} req
   * @param {Response} res
   */
  async create(req, res) {
    throw new Error('Method create() must be implemented');
  }

  /**
   * Cập nhật record
   * @param {Request} req
   * @param {Response} res
   */
  async update(req, res) {
    throw new Error('Method update() must be implemented');
  }

  /**
   * Xóa record
   * @param {Request} req
   * @param {Response} res
   */
  async delete(req, res) {
    throw new Error('Method delete() must be implemented');
  }

  /**
   * Helper response success
   */
  success(res, data = {}, statusCode = 200) {
    return res.status(statusCode).json({ ok: true, ...data });
  }

  /**
   * Helper response error
   */
  error(res, message, statusCode = 400) {
    return res.status(statusCode).json({ ok: false, message });
  }
}

module.exports = IController;
