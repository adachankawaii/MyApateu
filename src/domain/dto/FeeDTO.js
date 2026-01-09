// FeeDTO.js - Fee Data Transfer Object

class FeeDTO {
  constructor(data = {}) {
    this.id = data.id || null;
    this.room_id = data.room_id || null;
    this.person_id = data.person_id || null;
    this.vehicle_id = data.vehicle_id || null;
    this.fee_name = data.fee_name || '';
    this.fee_type = data.fee_type || 'ROOM'; // ROOM, PARKING, OTHER
    this.period = data.period || null;
    this.quantity = data.quantity || 1;
    this.unit_price = data.unit_price || 0;
    this.amount_due = data.amount_due || 0;
    this.amount_paid = data.amount_paid || 0;
    this.due_date = data.due_date || null;
    this.status = data.status || 'UNPAID'; // UNPAID, PARTIAL, PAID
    this.note = data.note || null;
    this.created_at = data.created_at || null;

    // Computed fields
    this.room_no = data.room_no || null;
    this.plate = data.plate || null;
    this.paid_sum = data.paid_sum || null;
  }

  /**
   * Chuyển đổi sang object thuần
   */
  toJSON() {
    return {
      id: this.id,
      room_id: this.room_id,
      person_id: this.person_id,
      vehicle_id: this.vehicle_id,
      fee_name: this.fee_name,
      fee_type: this.fee_type,
      period: this.period,
      quantity: this.quantity,
      unit_price: this.unit_price,
      amount_due: this.amount_due,
      amount_paid: this.amount_paid,
      due_date: this.due_date,
      status: this.status,
      note: this.note,
      created_at: this.created_at,
      room_no: this.room_no,
      plate: this.plate,
      paid_sum: this.paid_sum
    };
  }

  /**
   * Tạo từ request body
   */
  static fromRequest(body) {
    const qty = Number(body.quantity ?? 1);
    const price = Number(body.unit_price ?? 0);
    const amount = Math.round(qty * price * 100) / 100;

    return new FeeDTO({
      room_id: body.room_id || null,
      person_id: body.person_id || null,
      vehicle_id: body.vehicle_id || null,
      fee_name: body.fee_name || '',
      fee_type: body.fee_type || 'ROOM',
      period: body.period || null,
      quantity: qty,
      unit_price: price,
      amount_due: amount,
      due_date: body.due_date || null,
      note: body.note || null
    });
  }

  /**
   * Validate dữ liệu
   */
  validate() {
    const errors = [];
    if (!this.fee_name) errors.push('Tên phí là bắt buộc');
    if (this.quantity < 0) errors.push('Số lượng phải >= 0');
    if (this.unit_price < 0) errors.push('Đơn giá phải >= 0');
    return errors;
  }

  /**
   * Validate date format
   */
  static isValidDate(dateStr) {
    if (!dateStr) return true;
    return /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr));
  }
}

module.exports = FeeDTO;
