// ParkingController.js - Vehicles & Parking Controller

const IController = require('./IController');
const parkingService = require('../../../domain/service/ParkingService');

class ParkingController extends IController {
  /**
   * GET /api/vehicles
   */
  async getAllVehicles(req, res) {
    try {
      const vehicles = await parkingService.getAllVehicles(req.query);
      return res.json({ ok: true, vehicles });
    } catch (e) {
      console.error('/api/vehicles', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * GET /api/vehicles/:id
   */
  async getVehicleById(req, res) {
    try {
      const result = await parkingService.getVehicleById(req.params.id);
      
      if (!result.success) {
        const status = result.notFound ? 404 : 400;
        return res.status(status).json({ ok: false, message: result.message });
      }

      return res.json({ ok: true, vehicle: result.vehicle });
    } catch (e) {
      console.error('/api/vehicles/:id', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * POST /api/vehicles
   */
  async createVehicle(req, res) {
    try {
      const result = await parkingService.createVehicle(req.body);
      
      if (!result.success) {
        return res.status(400).json({ ok: false, message: result.message });
      }

      return res.status(201).json({ ok: true, vehicle: result.vehicle });
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ ok: false, message: 'Biển số xe đã tồn tại' });
      }
      console.error('POST /api/vehicles', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * PUT /api/vehicles/:id
   */
  async updateVehicle(req, res) {
    try {
      const result = await parkingService.updateVehicle(req.params.id, req.body);
      
      if (!result.success) {
        return res.status(400).json({ ok: false, message: result.message });
      }

      return res.json({ ok: true, vehicle: result.vehicle });
    } catch (e) {
      console.error('PUT /api/vehicles/:id', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * DELETE /api/vehicles/:id
   */
  async deleteVehicle(req, res) {
    try {
      const result = await parkingService.deleteVehicle(req.params.id);
      
      if (!result.success) {
        const status = result.notFound ? 404 : 400;
        return res.status(status).json({ ok: false, message: result.message });
      }

      return res.json({ ok: true, vehicle_id: result.vehicle_id });
    } catch (e) {
      console.error('DELETE /api/vehicles/:id', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * POST /api/vehicles/:id/checkin
   */
  async checkinVehicle(req, res) {
    try {
      const result = await parkingService.checkinVehicle(
        req.params.id,
        req.body?.parking_slot
      );
      
      if (!result.success) {
        return res.status(400).json({ ok: false, message: result.message });
      }

      return res.json({ ok: true, vehicle: result.vehicle });
    } catch (e) {
      console.error('POST /api/vehicles/:id/checkin', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * POST /api/vehicles/:id/checkout
   */
  async checkoutVehicle(req, res) {
    try {
      const result = await parkingService.checkoutVehicle(req.params.id, req.body);
      
      if (!result.success) {
        const status = result.notFound ? 404 : 400;
        return res.status(status).json({ ok: false, message: result.message });
      }

      return res.json({ ok: true, vehicle_id: result.vehicle_id, fee: result.fee });
    } catch (e) {
      console.error('POST /api/vehicles/:id/checkout', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * GET /api/parking/statistics
   */
  async getStatistics(req, res) {
    try {
      const from = (req.query.from || '').trim();
      const to = (req.query.to || '').trim();

      const result = await parkingService.getStatistics(from, to);
      
      if (!result.success) {
        return res.status(400).json({ ok: false, message: result.message });
      }

      return res.json({
        ok: true,
        from: result.from,
        to: result.to,
        summary: result.summary,
        by_status: result.by_status,
        by_day: result.by_day
      });
    } catch (e) {
      console.error('/api/parking/statistics', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * GET /api/parking/vehicles-in-lot
   */
  async getVehiclesInLot(req, res) {
    try {
      const result = await parkingService.getVehiclesInLot(req.query);
      return res.json({ ok: true, vehicles: result.vehicles });
    } catch (e) {
      console.error('/api/parking/vehicles-in-lot', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }
}

module.exports = new ParkingController();
