// UserDTO.js - User Data Transfer Object

class UserDTO {
  constructor(data = {}) {
    this.id = data.id || null;
    this.username = data.username || '';
    this.password_hash = data.password_hash || '';
    this.full_name = data.full_name || '';
    this.email = data.email || '';
    this.phone = data.phone || '';
    this.role = data.role || 'RESIDENT'; // ADMIN, RESIDENT
    this.person_id = data.person_id || null;
    this.created_at = data.created_at || null;
  }

  /**
   * Chuyển đổi sang object thuần (không chứa password)
   */
  toPublic() {
    return {
      id: this.id,
      username: this.username,
      full_name: this.full_name,
      email: this.email,
      phone: this.phone,
      role: this.role,
      person_id: this.person_id,
      created_at: this.created_at
    };
  }

  /**
   * Tạo từ request body
   */
  static fromRequest(body) {
    return new UserDTO({
      username: (body.username || '').trim(),
      password_hash: body.password || body.password_hash || '',
      full_name: body.full_name || '',
      email: body.email || '',
      phone: body.phone || '',
      role: body.role || 'RESIDENT',
      person_id: body.person_id || null
    });
  }

  /**
   * Validate dữ liệu
   */
  validate() {
    const errors = [];
    if (!this.username) errors.push('Username là bắt buộc');
    if (!this.password_hash) errors.push('Password là bắt buộc');
    return errors;
  }
}

module.exports = UserDTO;
