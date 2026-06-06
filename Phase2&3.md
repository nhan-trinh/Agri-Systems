PHASE 4 — Module Farm Zone & Season

Mục tiêu: Quản lý vùng trồng GPS, mở/đóng vụ mùa.
Dependency: Phase 3 ✅ (cần farmer_id)

Back-end (Nhẫn)
#Nhiệm vụTrạng tháiGhi chú4.1Enable PostGIS extension trên PostgreSQL⏳ PendingCREATE EXTENSION postgis4.2Prisma schema + migration bảng FarmZone + Season⏳ Pendingboundary lưu GeoJSON4.3POST /api/v1/farm-zones — tạo vùng trồng⏳ PendingTính area_sqm từ PostGIS, check overlap BR-002-44.4GET /api/v1/farm-zones — danh sách vùng trồng⏳ Pending4.5GET /api/v1/farm-zones/:id — chi tiết⏳ Pending4.6PUT /api/v1/farm-zones/:id — cập nhật⏳ Pending4.7DELETE /api/v1/farm-zones/:id — soft delete⏳ PendingBR-002-6: không xóa nếu có season active4.8POST /api/v1/farm-zones/:id/seasons — mở vụ mùa⏳ PendingBR-003-2: chỉ 1 season ACTIVE/zone4.9GET /api/v1/farm-zones/:id/seasons — lịch sử vụ mùa⏳ Pending4.10PUT /api/v1/farm-zones/:id/seasons/:seasonId/close — đóng vụ mùa⏳ Pending4.11Unit tests⏳ Pending
Front-end Web Admin (Phúc)
#Nhiệm vụTrạng tháiGhi chú4.12Trang danh sách vùng trồng⏳ Pending4.13Form tạo vùng trồng + vẽ polygon trên bản đồ Leaflet⏳ Pending4.14Trang quản lý vụ mùa⏳ Pending
Front-end Zalo Mini App (Hiếu)
#Nhiệm vụTrạng tháiGhi chú4.15Màn hình xem vùng trồng của nông dân⏳ PendingRead-only