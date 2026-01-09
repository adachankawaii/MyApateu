// ResidentController.js - Resident (Rooms & Persons) Controller

const IController = require('./IController');
const residentService = require('../../../domain/service/ResidentService');

class ResidentController extends IController {
  // =============== ROOMS ===============

  /**
   * GET /api/rooms
   */
  async getAllRooms(req, res) {
    try {
      const { q, status, room_type } = req.query;
      const rooms = await residentService.getAllRooms({ q, status, room_type });
      return res.json(rooms);
    } catch (e) {
      console.error('GET /api/rooms error:', e);
      return res.status(500).json({ ok: false, message: 'Lỗi tải danh sách phòng' });
    }
  }

  /**
   * GET /api/rooms/:id
   */
  async getRoomById(req, res) {
    try {
      const result = await residentService.getRoomById(req.params.id);
      
      if (!result.success) {
        const status = result.notFound ? 404 : 400;
        return res.status(status).json({ ok: false, message: result.message });
      }

      return res.json({ ok: true, room: result.room });
    } catch (e) {
      console.error('/api/rooms/:id', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * POST /api/rooms
   */
  async createRoom(req, res) {
    try {
      const result = await residentService.createRoom(req.body);
      
      if (!result.success) {
        return res.status(400).json({ ok: false, message: result.message });
      }

      return res.json({
        ok: true,
        room_id: result.room_id,
        user_id: result.user_id,
        person_id: result.person_id
      });
    } catch (e) {
      console.error('POST /api/rooms error:', e);
      return res.status(500).json({ ok: false, message: 'Lỗi tạo phòng + chủ hộ' });
    }
  }

  /**
   * PUT /api/rooms/:id
   */
  async updateRoom(req, res) {
    try {
      const result = await residentService.updateRoom(req.params.id, req.body);
      
      if (!result.success) {
        return res.status(400).json({ ok: false, message: result.message });
      }

      return res.json({ ok: true, room: result.room });
    } catch (e) {
      console.error('PUT /api/rooms/:id', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * DELETE /api/rooms/:id
   */
  async deleteRoom(req, res) {
    try {
      const result = await residentService.deleteRoom(req.params.id);
      
      if (!result.success) {
        const status = result.notFound ? 404 : 400;
        return res.status(status).json({ ok: false, message: result.message });
      }

      return res.json({ ok: true, room_id: result.room_id });
    } catch (e) {
      console.error('DELETE /api/rooms/:id', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  // =============== PERSONS ===============

  /**
   * GET /api/persons
   */
  async getAllPersons(req, res) {
    try {
      const roomId = req.query.room_id || null;
      const persons = await residentService.getPersons(roomId);
      return res.json({ ok: true, persons });
    } catch (e) {
      console.error('/api/persons', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * GET /api/rooms/:id/persons
   */
  async getPersonsByRoom(req, res) {
    try {
      const persons = await residentService.getPersons(req.params.id);
      return res.json({ ok: true, persons });
    } catch (e) {
      console.error('/api/rooms/:id/persons', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * POST /api/persons
   */
  async createPerson(req, res) {
    try {
      const result = await residentService.createPerson(req.body);
      
      if (!result.success) {
        return res.status(400).json({ ok: false, message: result.message });
      }

      return res.status(201).json({ ok: true, person: result.person });
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ ok: false, message: 'CCCD hoặc email đã tồn tại' });
      }
      console.error('POST /api/persons', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * PUT /api/persons/:id
   */
  async updatePerson(req, res) {
    try {
      const result = await residentService.updatePerson(req.params.id, req.body);
      
      if (!result.success) {
        return res.status(400).json({ ok: false, message: result.message });
      }

      return res.json({ ok: true, person: result.person });
    } catch (e) {
      console.error('PUT /api/persons/:id', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * POST /api/persons/bulk_delete
   */
  async bulkDeletePersons(req, res) {
    try {
      const result = await residentService.bulkDeletePersons(req.body?.ids);
      
      if (!result.success) {
        return res.status(400).json({ ok: false, message: result.message });
      }

      return res.json({ ok: true, deleted: result.deleted });
    } catch (e) {
      console.error('POST /api/persons/bulk_delete', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }
}

module.exports = new ResidentController();
