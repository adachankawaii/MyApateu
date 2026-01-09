// BillingController.js - Fees & Payments Controller

const IController = require('./IController');
const billingService = require('../../../domain/service/BillingService');

class BillingController extends IController {
  // =============== FEES ===============

  /**
   * GET /api/fees
   */
  async getAllFees(req, res) {
    try {
      const result = await billingService.getAllFees(req.query);
      return res.json({
        ok: true,
        items: result.items,
        total: result.total,
        page: result.page,
        page_size: result.page_size
      });
    } catch (e) {
      console.error('/api/fees', e);
      return res.status(500).json({ ok: false, message: e.code || e.message || 'Server error' });
    }
  }

  /**
   * GET /api/fees/:id
   */
  async getFeeById(req, res) {
    try {
      const result = await billingService.getFeeById(req.params.id);
      
      if (!result.success) {
        const status = result.notFound ? 404 : 400;
        return res.status(status).json({ ok: false, message: result.message });
      }

      return res.json({ ok: true, fee: result.fee });
    } catch (e) {
      console.error('/api/fees/:id', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * POST /api/fees
   */
  async createFee(req, res) {
    try {
      const result = await billingService.createFee(req.body);
      
      if (!result.success) {
        return res.status(400).json({ ok: false, message: result.message });
      }

      return res.status(201).json({ ok: true, fee: result.fee });
    } catch (e) {
      console.error('POST /api/fees', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * PUT /api/fees/:id
   */
  async updateFee(req, res) {
    try {
      const result = await billingService.updateFee(req.params.id, req.body);
      
      if (!result.success) {
        return res.status(400).json({ ok: false, message: result.message });
      }

      return res.json({ ok: true, fee: result.fee });
    } catch (e) {
      console.error('PUT /api/fees/:id', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * DELETE /api/fees/:id
   */
  async deleteFee(req, res) {
    try {
      const result = await billingService.deleteFee(req.params.id);
      
      if (!result.success) {
        const status = result.notFound ? 404 : 400;
        return res.status(status).json({ ok: false, message: result.message });
      }

      return res.json({ ok: true, deleted_id: result.deleted_id });
    } catch (e) {
      console.error('DELETE /api/fees/:id', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * GET /api/fees/overdue
   * Lấy danh sách khoản phí quá hạn
   */
  async getOverdueFees(req, res) {
    try {
      const result = await billingService.getOverdueFees();
      return res.json({ ok: true, items: result });
    } catch (e) {
      console.error('GET /api/fees/overdue', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  // =============== PAYMENTS ===============

  /**
   * GET /api/fees/:id/payments
   */
  async getPaymentsByFee(req, res) {
    try {
      const result = await billingService.getPaymentsByFee(req.params.id);
      
      if (!result.success) {
        return res.status(400).json({ ok: false, message: result.message });
      }

      return res.json({ ok: true, payments: result.payments });
    } catch (e) {
      console.error('/api/fees/:id/payments', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }

  /**
   * POST /api/payments
   */
  async createPayment(req, res) {
    try {
      const userId = Number(req.session.userId);
      const result = await billingService.createPayment(req.body, userId);
      
      if (!result.success) {
        const status = result.notFound ? 404 : 400;
        return res.status(status).json({ ok: false, message: result.message });
      }

      return res.status(201).json({
        ok: true,
        payment: result.payment,
        fee_id: result.fee_id,
        new_status: result.new_status,
        new_amount_paid: result.new_amount_paid
      });
    } catch (e) {
      console.error('POST /api/payments', e);
      return res.status(500).json({ ok: false, message: e.code || 'Server error' });
    }
  }
}

module.exports = new BillingController();
