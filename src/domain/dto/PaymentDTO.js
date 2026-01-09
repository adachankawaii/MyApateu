// PaymentDTO.js - Payment Data Transfer Object

class PaymentDTO {
  constructor(data = {}) {
    this.id = data.id || null;
    this.fee_id = data.fee_id || null;
    this.user_id = data.user_id || null;
    this.payment_date = data.payment_date || null;
    this.amount = data.amount || 0;
    this.method = data.method || 'CASH'; // CASH, TRANSFER, CARD
    this.note = data.note || null;
    this.created_at = data.created_at || null;

    // Computed fields
    this.created_by_name = data.created_by_name || null;
  }

  /**
   * Chuyển đổi sang object thuần
   */
  toJSON() {
    return {
      id: this.id,
      fee_id: this.fee_id,
      user_id: this.user_id,
      payment_date: this.payment_date,
      amount: this.amount,
      method: this.method,
      note: this.note,
      created_at: this.created_at,
      created_by_name: this.created_by_name
    };
  }

  /**
   * Tạo từ request body
   */
  static fromRequest(body) {
    return new PaymentDTO({
      fee_id: body.fee_id || null,
      amount: Number(body.amount || 0),
      method: body.method || 'CASH',
      note: body.note || null
    });
  }

  /**
   * Validate dữ liệu
   */
  validate() {
    const errors = [];
    if (!this.fee_id) errors.push('fee_id là bắt buộc');
    if (!Number.isFinite(this.amount) || this.amount <= 0) {
      errors.push('Số tiền thanh toán phải > 0');
    }
    return errors;
  }
}

module.exports = PaymentDTO;
