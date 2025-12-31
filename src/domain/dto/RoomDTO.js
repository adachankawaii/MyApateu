// RoomDTO.js - Room Data Transfer Object

class RoomDTO {
  constructor(data = {}) {
    this.id = data.id || null;
    this.room_no = data.room_no || '';
    this.building = data.building || null;
    this.floor = data.floor || null;
    this.room_type = data.room_type || null;
    this.area_m2 = data.area_m2 || null;
    this.status = data.status || null;
    this.contract_start = data.contract_start || null;
    this.contract_end = data.contract_end || null;
    this.note = data.note || null;
    this.created_at = data.created_at || null;
    
    // Computed fields
    this.head_name = data.head_name || null;
    this.head_phone = data.head_phone || null;
    this.occupants_count = data.occupants_count || data.occupants_count_calc || 0;
  }

  /**
   * Chuyển đổi sang object thuần
   */
  toJSON() {
    return {
      id: this.id,
      room_no: this.room_no,
      building: this.building,
      floor: this.floor,
      room_type: this.room_type,
      area_m2: this.area_m2,
      status: this.status,
      contract_start: this.contract_start,
      contract_end: this.contract_end,
      note: this.note,
      created_at: this.created_at,
      head_name: this.head_name,
      head_phone: this.head_phone,
      occupants_count: this.occupants_count
    };
  }

  /**
   * Tạo từ request body
   */
  static fromRequest(body) {
    return new RoomDTO({
      room_no: body.room_no || '',
      building: body.building || null,
      floor: body.floor || null,
      room_type: body.room_type || null,
      area_m2: body.area_m2 || null,
      status: body.status || null,
      contract_start: body.contract_start || null,
      contract_end: body.contract_end || null,
      note: body.note || null
    });
  }

  /**
   * Validate dữ liệu
   */
  validate() {
    const errors = [];
    if (!this.room_no) errors.push('Số phòng là bắt buộc');
    return errors;
  }
}

module.exports = RoomDTO;
