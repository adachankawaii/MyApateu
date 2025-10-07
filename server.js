const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Database setup
const db = new sqlite3.Database('./bluemoon.db');

// Initialize database tables
db.serialize(() => {
  // Vehicles table
  db.run(`CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    license_plate TEXT UNIQUE NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    color TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    owner_phone TEXT NOT NULL,
    card_id TEXT UNIQUE,
    parking_spot TEXT,
    status TEXT DEFAULT 'pending',
    monthly_fee INTEGER NOT NULL,
    expiry_date TEXT,
    created_date TEXT DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
  )`);

  // Parking spots table
  db.run(`CREATE TABLE IF NOT EXISTS parking_spots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    spot_id TEXT UNIQUE NOT NULL,
    zone TEXT NOT NULL,
    level TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    status TEXT DEFAULT 'available',
    vehicle_id INTEGER,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
  )`);

  // Transactions table
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT 'pending',
    transaction_date TEXT DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    invoice_number TEXT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
  )`);

  // Insert sample data
  insertSampleData();
});

function insertSampleData() {
  // Insert parking spots
  const spots = [
    // Car spots (Level B1, Zone A)
    ...Array.from({length: 20}, (_, i) => [`A${String(i+1).padStart(2, '0')}`, 'A', 'B1', 'car']),
    // Motorcycle spots (Level 1, Zone B)
    ...Array.from({length: 16}, (_, i) => [`B${String(i+1).padStart(2, '0')}`, 'B', '1', 'motorcycle'])
  ];

  const insertSpot = db.prepare(`INSERT OR IGNORE INTO parking_spots (spot_id, zone, level, vehicle_type) VALUES (?, ?, ?, ?)`);
  spots.forEach(spot => insertSpot.run(...spot));
  insertSpot.finalize();

  // Insert sample vehicles
  db.run(`INSERT OR IGNORE INTO vehicles (
    type, license_plate, brand, model, color, owner_name, owner_phone, 
    card_id, parking_spot, status, monthly_fee, expiry_date
  ) VALUES 
    ('car', '30A-12345', 'Honda', 'City', 'Trắng', 'Nguyễn Văn A', '0901234567', 'CAR001', 'A15', 'active', 500000, '2025-12-31'),
    ('motorcycle', '30B1-67890', 'Yamaha', 'Sirius', 'Đen', 'Trần Thị B', '0987654321', null, null, 'pending', 100000, null)`);

  // Update parking spots status
  db.run(`UPDATE parking_spots SET status = 'occupied', vehicle_id = 1 WHERE spot_id = 'A15'`);
  
  // Insert sample spots as occupied/reserved
  const occupiedSpots = ['A01', 'A02', 'A05', 'A07', 'A09', 'A11', 'A14', 'A17', 'A19', 'B01', 'B03', 'B05', 'B07', 'B09', 'B11', 'B13', 'B15'];
  const reservedSpots = ['A04', 'A13', 'B06'];
  
  occupiedSpots.forEach(spot => {
    db.run(`UPDATE parking_spots SET status = 'occupied' WHERE spot_id = ?`, [spot]);
  });
  
  reservedSpots.forEach(spot => {
    db.run(`UPDATE parking_spots SET status = 'reserved' WHERE spot_id = ?`, [spot]);
  });

  // Insert sample transactions
  db.run(`INSERT OR IGNORE INTO transactions (
    vehicle_id, type, amount, payment_method, status, description, invoice_number
  ) VALUES 
    (1, 'monthly_fee', 500000, 'bank_transfer', 'completed', 'Thanh toán phí đậu xe tháng 10', 'INV2025100101'),
    (2, 'registration_fee', 50000, 'cash', 'pending', 'Phí đăng ký xe máy mới', 'REG2025100201'),
    (1, 'annual_fee', 6000000, 'bank_transfer', 'completed', 'Gia hạn thẻ xe 12 tháng', 'EXT2025091501')`);
}

// API Routes

// Get all vehicles for current user
app.get('/api/vehicles', (req, res) => {
  db.all(`
    SELECT v.*, ps.spot_id as current_spot 
    FROM vehicles v 
    LEFT JOIN parking_spots ps ON v.parking_spot = ps.spot_id 
    ORDER BY v.created_date DESC
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ vehicles: rows });
  });
});

// Get parking spots status
app.get('/api/parking/spots', (req, res) => {
  db.all(`
    SELECT ps.*, v.license_plate, v.brand, v.model 
    FROM parking_spots ps 
    LEFT JOIN vehicles v ON ps.vehicle_id = v.id 
    ORDER BY ps.zone, ps.spot_id
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Group by zone
    const grouped = rows.reduce((acc, spot) => {
      const key = `${spot.level}-${spot.zone}`;
      if (!acc[key]) {
        acc[key] = {
          zone: spot.zone,
          level: spot.level,
          vehicle_type: spot.vehicle_type,
          spots: []
        };
      }
      acc[key].spots.push(spot);
      return acc;
    }, {});
    
    res.json({ parking_zones: Object.values(grouped) });
  });
});

// Get parking statistics
app.get('/api/parking/stats', (req, res) => {
  db.all(`
    SELECT 
      status,
      COUNT(*) as count
    FROM parking_spots 
    GROUP BY status
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const stats = {
      total: 0,
      available: 0,
      occupied: 0,
      reserved: 0
    };
    
    rows.forEach(row => {
      stats.total += row.count;
      stats[row.status] = row.count;
    });
    
    res.json({ stats });
  });
});

// Register new vehicle
app.post('/api/vehicles', (req, res) => {
  const { type, license_plate, brand, model, color, owner_name, owner_phone, notes } = req.body;
  
  // Calculate monthly fee based on vehicle type
  const fees = {
    car: 500000,
    motorcycle: 100000,
    bicycle: 20000,
    electric: 200000
  };
  
  const monthly_fee = fees[type] || 0;
  const card_id = `${type.toUpperCase()}${Date.now().toString().slice(-3)}`;
  
  db.run(`
    INSERT INTO vehicles (
      type, license_plate, brand, model, color, owner_name, owner_phone, 
      card_id, monthly_fee, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [type, license_plate, brand, model, color, owner_name, owner_phone, card_id, monthly_fee, notes], 
  function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    
    // Add registration transaction
    db.run(`
      INSERT INTO transactions (
        vehicle_id, type, amount, status, description
      ) VALUES (?, 'registration_fee', 50000, 'pending', 'Phí đăng ký phương tiện mới')
    `, [this.lastID]);
    
    res.json({ 
      message: 'Đăng ký thành công!', 
      vehicle_id: this.lastID,
      card_id: card_id
    });
  });
});

// Get transaction history
app.get('/api/transactions', (req, res) => {
  db.all(`
    SELECT t.*, v.license_plate, v.brand, v.model, v.card_id
    FROM transactions t
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    ORDER BY t.transaction_date DESC
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ transactions: rows });
  });
});

// Update vehicle status
app.put('/api/vehicles/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  db.run(`UPDATE vehicles SET status = ? WHERE id = ?`, [status, id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: 'Cập nhật trạng thái thành công!' });
  });
});

// Reserve parking spot
app.post('/api/parking/reserve', (req, res) => {
  const { spot_id, vehicle_id } = req.body;
  
  db.run(`
    UPDATE parking_spots 
    SET status = 'reserved', vehicle_id = ? 
    WHERE spot_id = ? AND status = 'available'
  `, [vehicle_id, spot_id], function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(400).json({ error: 'Vị trí không khả dụng!' });
      return;
    }
    
    res.json({ message: `Đã đặt chỗ ${spot_id} thành công!` });
  });
});

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'home_resident.html'));
});

app.get('/parking', (req, res) => {
  res.sendFile(path.join(__dirname, 'parking.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 BlueMoon API Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: bluemoon.db`);
  console.log(`🌐 Frontend: http://localhost:${PORT}/parking.html`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('📦 Database connection closed.');
    process.exit(0);
  });
});