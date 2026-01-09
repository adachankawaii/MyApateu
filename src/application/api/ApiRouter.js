// ApiRouter.js - Main API Router

const express = require('express');
const router = express.Router();

// Middleware
const { requireAuth } = require('../middleware/RequireAuthMiddleware');
const { sanitizeBody } = require('../middleware/ValidationMiddleware');

// Controllers
const authController = require('./controllers/AuthController');
const residentController = require('./controllers/ResidentController');
const billingController = require('./controllers/BillingController');
const parkingController = require('./controllers/ParkingController');

// Apply sanitize body middleware
router.use(sanitizeBody);

// ===============================
// Health Check
// ===============================
router.get('/health', (req, res) => res.json({ ok: true, service: 'bluemoon-api' }));

// ===============================
// Auth Routes
// ===============================
router.post('/login', (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/check-session', (req, res) => authController.checkSession(req, res));
router.get('/me', requireAuth, (req, res) => authController.me(req, res));
router.get('/building', (req, res) => authController.getBuildingInfo(req, res));

// ===============================
// Rooms Routes
// ===============================
router.get('/rooms', (req, res) => residentController.getAllRooms(req, res));
router.get('/rooms/:id', requireAuth, (req, res) => residentController.getRoomById(req, res));
router.post('/rooms', (req, res) => residentController.createRoom(req, res));
router.put('/rooms/:id', requireAuth, (req, res) => residentController.updateRoom(req, res));
router.delete('/rooms/:id', requireAuth, (req, res) => residentController.deleteRoom(req, res));

// ===============================
// Persons Routes
// ===============================
router.get('/persons', (req, res) => residentController.getAllPersons(req, res));
router.get('/rooms/:id/persons', (req, res) => residentController.getPersonsByRoom(req, res));
router.post('/persons', requireAuth, (req, res) => residentController.createPerson(req, res));
router.put('/persons/:id', requireAuth, (req, res) => residentController.updatePerson(req, res));
router.post('/persons/bulk_delete', (req, res) => residentController.bulkDeletePersons(req, res));

// ===============================
// Vehicles Routes
// ===============================
router.get('/vehicles', requireAuth, (req, res) => parkingController.getAllVehicles(req, res));
router.get('/vehicles/:id', requireAuth, (req, res) => parkingController.getVehicleById(req, res));
router.post('/vehicles', requireAuth, (req, res) => parkingController.createVehicle(req, res));
router.put('/vehicles/:id', requireAuth, (req, res) => parkingController.updateVehicle(req, res));
router.delete('/vehicles/:id', requireAuth, (req, res) => parkingController.deleteVehicle(req, res));
router.post('/vehicles/:id/checkin', requireAuth, (req, res) => parkingController.checkinVehicle(req, res));
router.post('/vehicles/:id/checkout', requireAuth, (req, res) => parkingController.checkoutVehicle(req, res));

// ===============================
// Parking Routes
// ===============================
router.get('/parking/statistics', requireAuth, (req, res) => parkingController.getStatistics(req, res));
router.get('/parking/vehicles-in-lot', requireAuth, (req, res) => parkingController.getVehiclesInLot(req, res));

// ===============================
// Fees Routes
// ===============================
router.get('/fees/overdue', requireAuth, (req, res) => billingController.getOverdueFees(req, res));
router.get('/fees', requireAuth, (req, res) => billingController.getAllFees(req, res));
router.get('/fees/:id', requireAuth, (req, res) => billingController.getFeeById(req, res));
router.post('/fees', requireAuth, (req, res) => billingController.createFee(req, res));
router.put('/fees/:id', requireAuth, (req, res) => billingController.updateFee(req, res));
router.delete('/fees/:id', requireAuth, (req, res) => billingController.deleteFee(req, res));
router.get('/fees/:id/payments', requireAuth, (req, res) => billingController.getPaymentsByFee(req, res));

// ===============================
// Payments Routes
// ===============================
router.post('/payments', requireAuth, (req, res) => billingController.createPayment(req, res));

module.exports = router;
