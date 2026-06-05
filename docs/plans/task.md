# Kế Hoạch Triển Khai (Task List) - AgriTrace Carbon Backend

| id | task | status | notes |
| --- | --- | --- | --- |
<<<<<<< HEAD
| setup-1 | Initialize configurations & Prisma | completed | Docker, Prisma, TS |
| setup-2 | Setup Express core & 10 modules | completed | Scaffolding 10 modules core |
| phase-1-1 | Schema: Cập nhật User model cho Zalo Auth | completed | zalo_id, is_first_login, password_hash nullable |
| phase-1-2 | Config: Bổ sung Zalo env vars & app.config | completed | ZALO_APP_ID, ZALO_APP_SECRET, ZALO_OAUTH_URL |
| phase-1-3 | Auth Types & DTOs (Zod schemas) | completed | ZaloLoginDto, LoginDto, RefreshDto... |
| phase-1-4 | Auth Repository (Prisma queries) | completed | findByPhone, findByZaloId, updateLastLogin |
| phase-1-5 | Zalo Service (OAuth + Graph API) | completed | exchangeCodeForToken, getUserProfile |
| phase-1-6 | Auth Service (Business Logic) | completed | zaloLogin, webLogin, refresh, logout, OTP |
| phase-1-7 | Auth Middleware (JWT guard + RBAC) | completed | requireAuth, requireRole, requireNotFirstLogin |
| phase-1-8 | Auth Controller (HTTP handlers) | completed | 9 endpoints theo spec |
| phase-1-9 | Auth Router (mount endpoints) | completed | Mount tất cả routes |
| phase-1-10 | Auth Unit Tests | completed | 14/14 passed |
| phase-1-11 | Cài dependencies mới (bcryptjs, axios) | completed | bcryptjs, axios |
| phase-1-12 | Verify: tsc + jest | completed | tsc ✅ jest 14/14 ✅ |
| phase-2-1 | Module Farmer: CRUD Hộ nông dân | todo | BR-001: sinh farmer_code, unique phone |
| phase-2-2 | Module FarmZone: Quản lý Vùng trồng & GPS | todo | BR-002: PostGIS GeoJSON, tính diện tích, chặn overlap |
| phase-3-1 | Module FarmingLog: Quản lý Vụ mùa (Season) | todo | BR-003: 1 vụ mùa ACTIVE / vùng trồng |
| phase-3-2 | Module FarmingLog: Nhật ký canh tác & Thu hoạch | todo | BR-003: Ràng buộc các loại vật tư, trigger COMPLETED |
| phase-4-1 | Module Warehouse: Tồn kho & Phiếu Nhập/Xuất | todo | BR-005: Chặn xuất âm, cảnh báo HSD |
| phase-5-1 | Module OCR: Xử lý hóa đơn Async với BullMQ | todo | BR-007: Trạng thái RAW -> CONFIRMED |
| phase-6-1 | Module CheckVN: Quản lý Lô hàng (Batch) | todo | BR-004: Validate weight với vụ mùa |
| phase-6-2 | Module CheckVN: Tích hợp QR Code Workflow | todo | BR-004: Gọi CheckVN API, cấp & kích hoạt QR |
| phase-7-1 | Module Carbon: Background Job tính toán Carbon | todo | BR-006: Emission factors, N2O, CO2 |
| phase-7-2 | Module Carbon: Xét duyệt & Cấp tín chỉ Carbon | todo | BR-006: Duyệt VERIFIED -> ISSUED |
| phase-8-1 | Module Reporting: Báo cáo tổng hợp Gov Viewer | todo | BR-008: Aggregate reports, Export Async |
| phase-8-2 | Module Notification: Hệ thống thông báo | todo | Báo khi OCR xong, Carbon cấp, hết hạn QR |
=======
| task-1 | Initialize configurations | completed | |
| task-2 | Setup Prisma schema | completed | |
| task-3 | Setup Express core infrastructure | completed | |
| task-4 | Scaffolding 10 modules | completed | |
| task-5 | Update Prisma Schema & Generate Prisma Client | completed | |
| task-6 | Implement Validation Tests for Farmer DTO | completed | |
| task-7 | Create and Apply Migration | completed | Using db push to sync schema directly. |
| task-8 | Create farm-zone.dto.ts with Zod schemas | completed | |
| task-9 | Implement database queries in farm-zone.repository.ts | completed | |
| task-10 | Implement business logic in farm-zone.service.ts | completed | |
| task-11 | Implement endpoints in farm-zone.controller.ts and router | completed | |
| task-12 | Write tests in farm-zone.test.ts | completed | |
| task-13 | Run backend tests and verify build | completed | |
| task-14 | Implement FrontEnd FarmZoneMap Leaflet drawing component | completed | |
| task-15 | Implement FrontEnd farm-zones/page.tsx CRUD | completed | |
| task-16 | Verify frontend build and perform manual test verification | completed | |
>>>>>>> d2b5dd70acbdf0cc2556f56ad80b63903d6bb3b6
