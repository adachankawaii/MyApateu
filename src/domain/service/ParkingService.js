// ParkingService.js - Vehicles & Parking Service

const parkingRepository = require('../../infrastructure/repository/ParkingRepositoryImpl');
const { isDateLike, toNum } = require('../shared/DomainUtils');

class ParkingService {
  /**
   * Lấy danh sách vehicles
   */
  async getAllVehicles(filters = {}) {
    return parkingRepository.findAll(filters);
  }

  /**
   * Lấy vehicle theo ID
   */
  async getVehicleById(id) {
    const vehicleId = toNum(id);
    if (!vehicleId) {
      return { success: false, message: 'vehicle id không hợp lệ' };
    }

    const vehicle = await parkingRepository.findById(vehicleId);
    if (!vehicle) {
      return { success: false, message: 'Vehicle not found', notFound: true };
    }

    return { success: true, vehicle };
  }

  /**
   * Tạo vehicle mới
   */
  async createVehicle(data) {
    const roomId = toNum(data.room_id);
    if (!roomId || !data.plate) {
      return { success: false, message: 'Thiếu room_id hoặc plate' };
    }

    const vehicle = await parkingRepository.create({
      ...data,
      room_id: roomId,
      person_id: toNum(data.person_id)
    });

    return { success: true, vehicle };
  }

  /**
   * Cập nhật vehicle
   */
  async updateVehicle(id, data) {
    const vehicleId = toNum(id);
    if (!vehicleId) {
      return { success: false, message: 'vehicle id không hợp lệ' };
    }

    const vehicle = await parkingRepository.update(vehicleId, data);
    if (!vehicle) {
      return { success: false, message: 'Không có trường nào để cập nhật' };
    }

    return { success: true, vehicle };
  }

  /**
   * Xóa vehicle
   */
  async deleteVehicle(id) {
    const vehicleId = toNum(id);
    if (!vehicleId) {
      return { success: false, message: 'vehicle id không hợp lệ' };
    }

    const deleted = await parkingRepository.delete(vehicleId);
    if (!deleted) {
      return { success: false, message: 'Vehicle not found', notFound: true };
    }

    return { success: true, vehicle_id: vehicleId };
  }

  /**
   * Check-in xe
   */
  async checkinVehicle(id, parkingSlot) {
    const vehicleId = toNum(id);
    if (!vehicleId) {
      return { success: false, message: 'vehicle id không hợp lệ' };
    }

    const vehicle = await parkingRepository.checkin(vehicleId, parkingSlot);
    return { success: true, vehicle };
  }

  /**
   * Check-out xe
   */
  async checkoutVehicle(id, feeData = {}) {
    const vehicleId = toNum(id);
    if (!vehicleId) {
      return { success: false, message: 'vehicle id không hợp lệ' };
    }

    const price = Number(feeData.unit_price || 0);
    const qty = Number(feeData.quantity || 1);

    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(qty) || qty < 0) {
      return { success: false, message: 'unit_price và quantity phải là số không âm' };
    }

    const result = await parkingRepository.checkout(vehicleId, feeData);
    if (!result) {
      return { success: false, message: 'Vehicle not found', notFound: true };
    }

    return { success: true, ...result };
  }

  /**
   * Thống kê parking
   */
  async getStatistics(from, to) {
    if (!from || !to || !isDateLike(from) || !isDateLike(to)) {
      return {
        success: false,
        message: 'from/to phải dạng YYYY-MM-DD và không được rỗng'
      };
    }

    const stats = await parkingRepository.getStatistics(from, to);
    return { success: true, from, to, ...stats };
  }

  /**
   * Lấy xe đang trong bãi
   */
  async getVehiclesInLot(filters = {}) {
    const vehicles = await parkingRepository.getVehiclesInLot(filters);
    return { success: true, vehicles };
  }
}

module.exports = new ParkingService();
