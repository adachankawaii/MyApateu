// VehicleDTO.js - Vehicle Data Transfer Object

class VehicleDTO {
  constructor(data = {}) {
    this.id = data.id || null;
    this.room_id = data.room_id || null;
    this.person_id = data.person_id || null;
    this.plate = data.plate || '';
    this.vehicle_type = data.vehicle_type || 'MOTORBIKE'; // MOTORBIKE, CAR, BICYCLE
    this.brand = data.brand || null;
    this.model = data.model || null;
    this.color = data.color || null;
    this.parking_status = data.parking_status || 'OUT'; // IN, OUT
    this.parking_slot = data.parking_slot || null;
    this.last_checkin = data.last_checkin || null;
    this.last_checkout = data.last_checkout || null;
    this.parking_fee_total = data.parking_fee_total || 0;
    this.created_at = data.created_at || null;

    // Computed fields
    this.room_no = data.room_no || null;
    this.owner_name = data.owner_name || null;
  }

  /**
   * Chuyển đổi sang object thuần
   */
  toJSON() {
    return {
      id: this.id,
      room_id: this.room_id,
      person_id: this.person_id,
      plate: this.plate,
      vehicle_type: this.vehicle_type,
      brand: this.brand,
      model: this.model,
      color: this.color,
      parking_status: this.parking_status,
      parking_slot: this.parking_slot,
      last_checkin: this.last_checkin,
      last_checkout: this.last_checkout,
      parking_fee_total: this.parking_fee_total,
      created_at: this.created_at,
      room_no: this.room_no,
      owner_name: this.owner_name
    };
  }

  /**
   * Tạo từ request body
   */
  static fromRequest(body) {
    return new VehicleDTO({
      room_id: body.room_id || null,
      person_id: body.person_id || null,
      plate: body.plate || '',
      vehicle_type: body.vehicle_type || 'MOTORBIKE',
      brand: body.brand || null,
      model: body.model || null,
      color: body.color || null
    });
  }

  /**
   * Validate dữ liệu
   */
  validate() {
    const errors = [];
    if (!this.room_id) errors.push('room_id là bắt buộc');
    if (!this.plate) errors.push('Biển số xe là bắt buộc');
    return errors;
  }
}

module.exports = VehicleDTO;
