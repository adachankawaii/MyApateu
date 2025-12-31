// PersonDTO.js - Person Data Transfer Object

class PersonDTO {
  constructor(data = {}) {
    this.id = data.id || null;
    this.room_id = data.room_id || null;
    this.full_name = data.full_name || '';
    this.cccd = data.cccd || null;
    this.ethnicity = data.ethnicity || null;
    this.occupation = data.occupation || null;
    this.dob = data.dob || null;
    this.hometown = data.hometown || null;
    this.relation_to_head = data.relation_to_head || null;
    this.phone = data.phone || null;
    this.email = data.email || null;
    this.is_head = data.is_head || false;
    this.created_at = data.created_at || null;
  }

  /**
   * Chuyển đổi sang object thuần
   */
  toJSON() {
    return {
      id: this.id,
      room_id: this.room_id,
      full_name: this.full_name,
      cccd: this.cccd,
      ethnicity: this.ethnicity,
      occupation: this.occupation,
      dob: this.dob,
      hometown: this.hometown,
      relation_to_head: this.relation_to_head,
      phone: this.phone,
      email: this.email,
      is_head: this.is_head,
      created_at: this.created_at
    };
  }

  /**
   * Tạo từ request body
   */
  static fromRequest(body) {
    return new PersonDTO({
      room_id: body.room_id || null,
      full_name: body.full_name || '',
      cccd: body.cccd || null,
      ethnicity: body.ethnicity || null,
      occupation: body.occupation || null,
      dob: body.dob || null,
      hometown: body.hometown || null,
      relation_to_head: body.relation_to_head || null,
      phone: body.phone || null,
      email: body.email || null,
      is_head: body.is_head || false
    });
  }

  /**
   * Validate dữ liệu
   */
  validate() {
    const errors = [];
    if (!this.room_id) errors.push('room_id là bắt buộc');
    if (!this.full_name) errors.push('Họ tên là bắt buộc');
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

module.exports = PersonDTO;
