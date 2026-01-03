// src/application/api/ApiRouter.js
const express = require('express');
const router = express.Router();

require('./controllers/BasicController')(router);
require('./controllers/AuthController')(router);
require('./controllers/BuildingController')(router);
require('./controllers/ResidentController')(router);
require('./controllers/ParkingController')(router);
require('./controllers/BillingController')(router);

module.exports = router;
