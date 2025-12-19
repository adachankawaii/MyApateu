# 🏢 BlueMoon - Hệ thống Quản lý Chung cư

Hệ thống quản lý chung cư BlueMoon toàn diện với giao diện hiện đại, hỗ trợ quản lý cư dân, căn hộ, phí dịch vụ, bãi xe và nhiều tính năng khác.

## ✨ Tính năng chính

### 👤 Dành cho Admin
- **Quản lý Cư dân & Căn hộ**: Thêm, sửa, xóa thông tin cư dân và phòng
- **Quản lý Hóa đơn & Thanh toán**: Tạo phí, theo dõi thanh toán, xuất báo cáo
- **Quản lý Bãi xe**: Check-in/out xe, quản lý slot, thống kê phí gửi xe
- **Tìm kiếm nhanh**: Tìm kiếm chức năng theo từ khóa với giao diện hiện đại
- **Dashboard trực quan**: Xem tổng quan hệ thống với biểu đồ và thống kê

### 🏠 Dành cho Cư dân
- **Xem thông tin phòng**: Thông tin hợp đồng, thành viên gia đình
- **Tra cứu hóa đơn**: Xem lịch sử thanh toán và công nợ
- **Quản lý xe**: Đăng ký xe, xem lịch sử ra vào

## 🚀 Cài đặt và Chạy

### 1. Yêu cầu hệ thống
- Node.js >= 14.x
- MySQL >= 8.0
- npm hoặc yarn

### 2. Cài đặt Dependencies

```bash
npm install
```

### 3. Cấu hình Database

Tạo database MySQL và cập nhật thông tin kết nối trong `server.js`:

```javascript
const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'aduser',
  password: 'lienquaṇ̉',
  database: 'bluedb',
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4'
});
```

### 4. Khởi động Server

```bash
# Development mode
node server.js

# Hoặc với nodemon (auto-restart)
npm run dev
```

Server sẽ chạy tại: **http://localhost:5000**

### 5. Truy cập Ứng dụng

- **Đăng nhập**: http://localhost:5000/auth/login.html
- **Trang Admin**: http://localhost:5000/admin/home_admin.html
- **Trang Cư dân**: http://localhost:5000/resident/home_resident.html

## 🗄️ Cấu trúc Database

### Bảng `rooms`
Quản lý thông tin căn hộ
```sql
- id: INT (Primary Key)
- room_no: VARCHAR(50) - Số phòng
- building: VARCHAR(10) - Tòa nhà
- floor: INT - Tầng
- room_type: ENUM('APARTMENT', 'STUDIO', 'PENTHOUSE')
- area_m2: DECIMAL(8,2) - Diện tích (m²)
- status: ENUM('OCCUPIED', 'VACANT', 'MAINTENANCE', 'RESERVED')
- contract_start: DATE - Ngày bắt đầu hợp đồng
- contract_end: DATE - Ngày kết thúc hợp đồng
- note: TEXT
- created_at: TIMESTAMP
```

### Bảng `persons`
Quản lý thông tin cư dân
```sql
- id: INT (Primary Key)
- room_id: INT (Foreign Key -> rooms.id)
- full_name: VARCHAR(255) - Họ tên
- cccd: VARCHAR(20) - CCCD/CMND (unique)
- ethnicity: VARCHAR(50) - Dân tộc
- occupation: VARCHAR(100) - Nghề nghiệp
- dob: DATE - Ngày sinh
- hometown: VARCHAR(255) - Quê quán
- relation_to_head: VARCHAR(50) - Quan hệ với chủ hộ
- phone: VARCHAR(20)
- email: VARCHAR(255)
- is_head: TINYINT(1) - Chủ hộ hay không
- created_at: TIMESTAMP
```

### Bảng `users`
Quản lý tài khoản đăng nhập
```sql
- id: INT (Primary Key)
- username: VARCHAR(100) (unique)
- password_hash: VARCHAR(255) - Mật khẩu
- phone: VARCHAR(20)
- email: VARCHAR(255)
- full_name: VARCHAR(255)
- role: ENUM('ADMIN', 'RESIDENT') - Vai trò
- person_id: INT (Foreign Key -> persons.id)
- created_at: TIMESTAMP
```

### Bảng `vehicles`
Quản lý phương tiện
```sql
- id: INT (Primary Key)
- room_id: INT (Foreign Key -> rooms.id)
- person_id: INT (Foreign Key -> persons.id)
- plate: VARCHAR(20) (unique) - Biển số xe
- vehicle_type: ENUM('CAR', 'MOTORBIKE', 'BICYCLE', 'ELECTRIC')
- brand: VARCHAR(100) - Hãng xe
- model: VARCHAR(100) - Model
- color: VARCHAR(50)
- parking_status: ENUM('IN', 'OUT') - Trạng thái gửi xe
- parking_slot: VARCHAR(20) - Vị trí đậu
- last_checkin: DATETIME - Lần check-in cuối
- last_checkout: DATETIME - Lần check-out cuối
- parking_fee_total: DECIMAL(15,2) - Tổng phí gửi xe
- created_at: TIMESTAMP
```

### Bảng `fees`
Quản lý khoản phí
```sql
- id: INT (Primary Key)
- room_id: INT (Foreign Key -> rooms.id)
- person_id: INT (Foreign Key -> persons.id)
- vehicle_id: INT (Foreign Key -> vehicles.id)
- fee_name: VARCHAR(255) - Tên khoản phí
- fee_type: ENUM('ROOM', 'PARKING', 'OTHER')
- period: VARCHAR(20) - Kỳ (YYYY-MM)
- quantity: DECIMAL(10,2) - Số lượng
- unit_price: DECIMAL(15,2) - Đơn giá
- amount_due: DECIMAL(15,2) - Số tiền phải trả
- amount_paid: DECIMAL(15,2) - Số tiền đã trả
- due_date: DATE - Hạn thanh toán
- status: ENUM('UNPAID', 'PARTIAL', 'PAID', 'CANCELLED')
- note: TEXT
- created_at: TIMESTAMP
```

### Bảng `payments`
Quản lý thanh toán
```sql
- id: INT (Primary Key)
- fee_id: INT (Foreign Key -> fees.id)
- user_id: INT (Foreign Key -> users.id)
- payment_date: DATETIME - Ngày thanh toán
- amount: DECIMAL(15,2) - Số tiền
- method: ENUM('CASH', 'TRANSFER', 'CARD', 'MOMO', 'OTHER')
- note: TEXT
- created_at: TIMESTAMP
```

## 🔌 API Endpoints

### Authentication
```
POST /api/login              - Đăng nhập
POST /api/logout             - Đăng xuất
GET  /api/me                 - Thông tin user hiện tại
```

### Rooms (Căn hộ)
```
GET    /api/rooms            - Lấy danh sách phòng (có filter)
GET    /api/rooms/:id        - Lấy chi tiết phòng
POST   /api/rooms            - Tạo phòng mới + tài khoản + chủ hộ
PUT    /api/rooms/:id        - Cập nhật thông tin phòng
DELETE /api/rooms/:id        - Xóa phòng (cascade)
```

### Persons (Cư dân)
```
GET    /api/persons                    - Lấy danh sách cư dân
GET    /api/rooms/:id/persons          - Lấy cư dân của 1 phòng
POST   /api/persons                    - Thêm cư dân mới
PUT    /api/persons/:id                - Cập nhật thông tin cư dân
POST   /api/persons/bulk_delete        - Xóa nhiều cư dân (không xóa chủ hộ)
```

### Vehicles (Phương tiện)
```
GET    /api/vehicles                   - Lấy danh sách xe
GET    /api/vehicles/:id               - Chi tiết xe
POST   /api/vehicles                   - Đăng ký xe mới
PUT    /api/vehicles/:id               - Cập nhật thông tin xe
DELETE /api/vehicles/:id               - Xóa xe (cascade fees)
POST   /api/vehicles/:id/checkin       - Check-in xe vào bãi
POST   /api/vehicles/:id/checkout      - Check-out xe (tạo fee)
GET    /api/parking/vehicles-in-lot    - Danh sách xe đang trong bãi
GET    /api/parking/statistics         - Thống kê bãi xe theo thời gian
```

### Fees (Khoản phí)
```
GET    /api/fees                - Danh sách phí (có filter, phân trang)
GET    /api/fees/:id            - Chi tiết khoản phí
POST   /api/fees                - Tạo khoản phí mới
PUT    /api/fees/:id            - Cập nhật khoản phí
DELETE /api/fees/:id            - Xóa khoản phí (cascade payments)
```

### Payments (Thanh toán)
```
GET    /api/fees/:id/payments   - Lịch sử thanh toán của 1 khoản phí
POST   /api/payments            - Ghi nhận thanh toán
```

### Misc
```
GET    /api/health              - Kiểm tra server
GET    /api/dbcheck             - Kiểm tra kết nối database
GET    /api/building            - Thông tin chung cư
```

## 📁 Cấu trúc Thư mục

```
MyApateu-1/
├── server.js                 # Server chính (Express + API)
├── package.json              # Dependencies
├── README.md                 # Tài liệu
└── public/                   # Frontend files
    ├── auth/
    │   └── login.html        # Trang đăng nhập
    ├── admin/
    │   ├── home_admin.html   # Dashboard admin
    │   ├── residents.html    # Quản lý cư dân & căn hộ
    │   ├── bills.html        # Quản lý hóa đơn
    │   └── parking.html      # Quản lý bãi xe
    ├── resident/
    │   └── home_resident.html # Dashboard cư dân
    └── common/
        ├── profile.html      # Hồ sơ cá nhân
        ├── about.html        # Giới thiệu
        ├── howto.html        # Hướng dẫn
        └── support.html      # Hỗ trợ
```

## 🎨 Tính năng UI/UX

- **Responsive Design**: Tương thích đa thiết bị
- **Modern UI**: Giao diện hiện đại với gradient, backdrop-filter
- **Dark Theme Support**: Hỗ trợ chế độ tối (đã loại bỏ)
- **Search Functionality**: Tìm kiếm nhanh chức năng kiểu Google
- **Animation**: Smooth transitions và hiệu ứng mượt mà
- **Background**: Nền toà nhà 3D với hiệu ứng parallax
- **Icon System**: SVG sprite system cho performance tốt

## 🔒 Bảo mật

- Session-based authentication với `express-session`
- Password hashing (demo: plain text, nên dùng bcrypt trong production)
- CORS configuration
- SQL injection prevention với prepared statements
- Foreign key constraints đảm bảo data integrity

## 🚧 Tính năng đang phát triển

- [ ] Thông báo & Bảng tin
- [ ] Lịch sự kiện cộng đồng
- [ ] Quản lý tòa nhà & mặt bằng
- [ ] Hệ thống ticket bảo trì
- [ ] Export báo cáo Excel/PDF
- [ ] Email notifications
- [ ] Upload ảnh/files
- [ ] Tích hợp thanh toán online

## 📝 Lưu ý

### Tài khoản mẫu
```
Admin:
- Username: admin
- Password: admin123

Cư dân:
- Username: user
- Password: user123
```

### Development Tips
- Sử dụng `nodemon` để auto-restart server khi code thay đổi
- Check console log để debug API calls
- Dùng MySQL Workbench hoặc phpMyAdmin để quản lý database
- Test API với Postman hoặc Thunder Client

## 🐛 Xử lý lỗi thường gặp

### Lỗi kết nối Database
```
Error: connect ECONNREFUSED
→ Kiểm tra MySQL service đã chạy chưa
→ Kiểm tra lại thông tin kết nối trong server.js
```

### Lỗi Foreign Key Constraint
```
ER_ROW_IS_REFERENCED_2
→ Xóa các bản ghi con trước khi xóa bản ghi cha
→ Hoặc sử dụng ON DELETE CASCADE
```

### Port đã được sử dụng
```
Error: listen EADDRINUSE :::5000
→ Đổi port trong server.js
→ Hoặc kill process đang dùng port: netstat -ano | findstr :5000
```

## 📞 Liên hệ & Hỗ trợ

Nếu có vấn đề, hãy liên hệ trực tiếp ban quản lý chung cư BlueMoon.

---

**BlueMoon Admin** • Demo build • v0.1 • © 2025
- method: ENUM('CASH', 'TRANSFER', 'CARD', 'MOMO', 'OTHER')
- note: TEXT
- created_at: TIMESTAMP
```

#### `parking_spots`
- `id` - Primary key
- `spot_id` - Mã vị trí (A01, B02, etc.)
- `zone` - Khu vực (A, B)
- `level` - Tầng (B1, 1)
- `vehicle_type` - Loại xe phù hợp
- `status` - Trạng thái (available, occupied, reserved)
- `vehicle_id` - ID xe đang đậu

#### `transactions`
- `id` - Primary key
- `vehicle_id` - ID phương tiện
- `type` - Loại giao dịch (monthly_fee, registration_fee, annual_fee)
- `amount` - Số tiền
- `payment_method` - Phương thức thanh toán
- `status` - Trạng thái (completed, pending, failed)
- `transaction_date` - Ngày giao dịch
- `description` - Mô tả
- `invoice_number` - Số hóa đơn

## 🔌 API Endpoints

### Vehicles
- `GET /api/vehicles` - Lấy danh sách phương tiện
- `POST /api/vehicles` - Đăng ký phương tiện mới
- `PUT /api/vehicles/:id/status` - Cập nhật trạng thái

### Parking
- `GET /api/parking/spots` - Lấy sơ đồ bãi đậu
- `GET /api/parking/stats` - Thống kê bãi đậu
- `POST /api/parking/reserve` - Đặt chỗ đậu xe

### Transactions
- `GET /api/transactions` - Lấy lịch sử giao dịch

## 📱 Frontend Features

### 🚗 Tab Phương tiện
- Hiển thị danh sách xe từ database
- Trạng thái real-time (active, pending, expired)
- Thông tin chi tiết: thẻ xe, vị trí, phí, ngày hết hạn

### 🅿️ Tab Bãi đậu
- Sơ đồ bãi đậu interactive từ database
- Thống kê real-time (trống, đã đậu, đã đặt)
- Đặt chỗ trực tiếp từ giao diện

### 📝 Tab Đăng ký
- Form đăng ký xe mới
- Lưu vào database qua API
- Auto-generate mã thẻ xe

### 📋 Tab Lịch sử
- Hiển thị giao dịch từ database
- Trạng thái thanh toán real-time
- Chi tiết hóa đơn và phương thức

## 🛠️ Development

### Thêm dữ liệu mẫu
Server tự động tạo dữ liệu mẫu khi khởi động lần đầu.

### Database file
Cơ sở dữ liệu SQLite được lưu tại: `./bluemoon.db`

### Logs
- Server logs hiển thị trong console
- Database errors được handle và trả về client

## 🔧 Troubleshooting

### Lỗi kết nối database
```
❌ Lỗi kết nối cơ sở dữ liệu
Vui lòng khởi động server: npm run dev
```

**Giải pháp**: Đảm bảo server đang chạy tại localhost:3001

### Lỗi CORS
Nếu gặp lỗi CORS, kiểm tra server có chạy đúng port 3001.

### Database locked
Restart server nếu database bị lock:
```bash
# Kill process và restart
npm run dev
```

## 📚 Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite3
- **Frontend**: Vanilla JavaScript + CSS
- **Theme**: Dark/Light mode support
- **API**: RESTful API design

## 🎯 Next Steps

1. **Authentication**: Thêm login/logout thực
2. **Real-time**: WebSocket cho cập nhật real-time
3. **Payment**: Tích hợp cổng thanh toán
4. **Mobile**: PWA support
5. **Reports**: Export Excel/PDF
6. **Notifications**: Push notifications

---

🏗️ **Developed by**: BlueMoon Development Team  
📅 **Version**: 1.0.0  
🔗 **Repository**: MyApateu