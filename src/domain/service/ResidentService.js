// ResidentService.js - Resident (Rooms & Persons) Service

const residentRepository = require('../../infrastructure/repository/ResidentRepositoryImpl');
const { isDateLike, toNum } = require('../shared/DomainUtils');

class ResidentService {
  // =============== ROOMS ===============

  /**
   * Lấy danh sách phòng
   */
  async getAllRooms(filters = {}) {
    return residentRepository.findAllRooms(filters);
  }

  /**
   * Lấy phòng theo ID
   */
  async getRoomById(id) {
    const roomId = toNum(id);
    if (!roomId) {
      return { success: false, message: 'room id không hợp lệ' };
    }

    const room = await residentRepository.findRoomById(roomId);
    if (!room) {
      return { success: false, message: 'Room not found', notFound: true };
    }

    return { success: true, room };
  }

  /**
   * Tạo phòng mới (có thể kèm chủ hộ + user)
   */
  async createRoom(data) {
    const { room_no, room_type, status, contract_start, contract_end,
            username, password, phone, email, full_name, role, person_data } = data;

    if (!room_no) {
      return { success: false, message: 'Thiếu room_no' };
    }

    const roomData = { room_no, room_type, status, contract_start, contract_end };
    const userData = username && password ? { username, password, phone, email, full_name, role } : null;

    const result = await residentRepository.createRoom(roomData, person_data, userData);
    return { success: true, ...result };
  }

  /**
   * Cập nhật phòng
   */
  async updateRoom(id, data) {
    const roomId = toNum(id);
    if (!roomId) {
      return { success: false, message: 'room id không hợp lệ' };
    }

    // Validate dates
    if ((data.contract_start && !isDateLike(data.contract_start)) ||
        (data.contract_end && !isDateLike(data.contract_end))) {
      return { success: false, message: 'contract_start/end phải dạng YYYY-MM-DD hoặc null' };
    }

    const room = await residentRepository.updateRoom(roomId, data);
    if (!room) {
      return { success: false, message: 'Không có trường nào để cập nhật' };
    }

    return { success: true, room };
  }

  /**
   * Xóa phòng
   */
  async deleteRoom(id) {
    const roomId = toNum(id);
    if (!roomId) {
      return { success: false, message: 'room id không hợp lệ' };
    }

    const deleted = await residentRepository.deleteRoom(roomId);
    if (!deleted) {
      return { success: false, message: 'Room not found', notFound: true };
    }

    return { success: true, room_id: roomId };
  }

  // =============== PERSONS ===============

  /**
   * Lấy danh sách cư dân
   */
  async getPersons(roomId = null) {
    return residentRepository.findPersonsByRoomId(toNum(roomId));
  }

  /**
   * Tạo cư dân mới
   */
  async createPerson(data) {
    const roomId = toNum(data.room_id);
    if (!roomId || !data.full_name) {
      return { success: false, message: 'Thiếu room_id hoặc full_name' };
    }

    if (!isDateLike(data.dob)) {
      return { success: false, message: 'dob phải dạng YYYY-MM-DD hoặc null' };
    }

    const person = await residentRepository.createPerson({
      ...data,
      room_id: roomId
    });

    return { success: true, person };
  }

  /**
   * Cập nhật cư dân
   */
  async updatePerson(id, data) {
    const personId = toNum(id);
    if (!personId) {
      return { success: false, message: 'person id không hợp lệ' };
    }

    if (data.dob && !isDateLike(data.dob)) {
      return { success: false, message: 'dob phải dạng YYYY-MM-DD hoặc null' };
    }

    const person = await residentRepository.updatePerson(personId, data);
    if (!person) {
      return { success: false, message: 'Không có trường nào để cập nhật' };
    }

    return { success: true, person };
  }

  /**
   * Xóa nhiều cư dân (không phải chủ hộ)
   */
  async bulkDeletePersons(ids) {
    const validIds = Array.isArray(ids)
      ? ids.map(toNum).filter(Boolean)
      : [];

    if (!validIds.length) {
      return { success: false, message: 'Danh sách ids trống' };
    }

    const deleted = await residentRepository.bulkDeletePersons(validIds);
    return { success: true, deleted };
  }
}

module.exports = new ResidentService();
