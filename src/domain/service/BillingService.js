// BillingService.js - Fees & Payments Service

const billingRepository = require('../../infrastructure/repository/BillingRepositoryImpl');
const { isDateLike, toNum } = require('../shared/DomainUtils');

class BillingService {
  // =============== FEES ===============

  /**
   * Lấy danh sách fees
   */
  async getAllFees(filters = {}) {
    const page = Math.max(1, parseInt(filters.page || '1', 10));
    const page_size = Math.min(100, Math.max(1, parseInt(filters.page_size || '20', 10)));

    return billingRepository.findAllFees({
      ...filters,
      page,
      page_size,
      room_id: toNum(filters.room_id),
      vehicle_id: toNum(filters.vehicle_id)
    });
  }

  /**
   * Lấy fee theo ID
   */
  async getFeeById(id) {
    const feeId = toNum(id);
    if (!feeId) {
      return { success: false, message: 'fee id không hợp lệ' };
    }

    const fee = await billingRepository.findFeeById(feeId);
    if (!fee) {
      return { success: false, message: 'Fee not found', notFound: true };
    }

    return { success: true, fee };
  }

  /**
   * Tạo fee mới
   */
  async createFee(data) {
    if (!data.fee_name) {
      return { success: false, message: 'Thiếu fee_name' };
    }

    const qty = Number(data.quantity ?? 1);
    const price = Number(data.unit_price ?? 0);

    if (!Number.isFinite(qty) || qty < 0 || !Number.isFinite(price) || price < 0) {
      return { success: false, message: 'quantity & unit_price phải là số không âm' };
    }

    if (!isDateLike(data.due_date)) {
      return { success: false, message: 'due_date phải dạng YYYY-MM-DD hoặc null' };
    }

    const fee = await billingRepository.createFee(data);
    return { success: true, fee };
  }

  /**
   * Cập nhật fee
   */
  async updateFee(id, data) {
    const feeId = toNum(id);
    if (!feeId) {
      return { success: false, message: 'fee id không hợp lệ' };
    }

    if (data.due_date && !isDateLike(data.due_date)) {
      return { success: false, message: 'due_date phải dạng YYYY-MM-DD hoặc null' };
    }

    const fee = await billingRepository.updateFee(feeId, data);
    if (!fee) {
      return { success: false, message: 'Không có trường nào để cập nhật' };
    }

    return { success: true, fee };
  }

  /**
   * Xóa fee
   */
  async deleteFee(id) {
    const feeId = toNum(id);
    if (!feeId) {
      return { success: false, message: 'fee id không hợp lệ' };
    }

    const deleted = await billingRepository.deleteFee(feeId);
    if (!deleted) {
      return { success: false, message: 'Fee not found', notFound: true };
    }

    return { success: true, deleted_id: feeId };
  }

  /**
   * Lấy danh sách khoản phí quá hạn
   */
  async getOverdueFees() {
    return billingRepository.findOverdueFees();
  }

  // =============== PAYMENTS ===============

  /**
   * Lấy payments theo fee
   */
  async getPaymentsByFee(feeId) {
    const id = toNum(feeId);
    if (!id) {
      return { success: false, message: 'fee id không hợp lệ' };
    }

    const payments = await billingRepository.findPaymentsByFeeId(id);
    return { success: true, payments };
  }

  /**
   * Tạo payment
   */
  async createPayment(data, userId) {
    const feeId = toNum(data.fee_id);
    const amt = Number(data.amount);

    if (!feeId || !Number.isFinite(amt) || amt <= 0) {
      return { success: false, message: 'fee_id hoặc amount không hợp lệ' };
    }

    const result = await billingRepository.createPayment({
      fee_id: feeId,
      amount: amt,
      method: data.method,
      note: data.note
    }, userId);

    if (!result) {
      return { success: false, message: 'Fee not found', notFound: true };
    }

    return { success: true, ...result };
  }
}

module.exports = new BillingService();
