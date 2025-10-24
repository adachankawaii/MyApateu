# 🏢 BlueMoon Apartment Management System

Hệ thống quản lý chung cư BlueMoon với cơ sở dữ liệu thực.

## 🚀 Cài đặt và Chạy

### 1. Cài đặt Dependencies

```bash
npm install
```

### 2. Khởi động Server

```bash
# Development mode (auto-restart)
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại: **http://localhost:3001**

### 3. Truy cập Ứng dụng

- **Trang chủ cư dân**: http://localhost:3001/home_resident.html
- **Thẻ xe & Bãi đậu**: http://localhost:3001/parking.html
- **API Documentation**: http://localhost:3001/api/vehicles

## 📊 Database Schema

### Tables

#### `vehicles`
- `id` - Primary key
- `type` - Loại xe (car, motorcycle, bicycle, electric)
- `license_plate` - Biển số xe (unique)
- `brand` - Hãng xe
- `model` - Model xe
- `color` - Màu sắc
- `owner_name` - Tên chủ xe
- `owner_phone` - Số điện thoại
- `card_id` - Mã thẻ xe
- `parking_spot` - Vị trí đậu xe
- `status` - Trạng thái (active, pending, expired)
- `monthly_fee` - Phí hàng tháng
- `expiry_date` - Ngày hết hạn
- `created_date` - Ngày tạo
- `notes` - Ghi chú

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