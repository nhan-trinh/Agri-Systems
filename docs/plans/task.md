# Kế Hoạch Triển Khai (Task List) - AgriTrace Carbon Backend

## Hướng Triển Khai Theo Phase (Roadmap)

| id | task | status | notes |
| --- | --- | --- | --- |
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
| phase-2-1 | Module Farmer: CRUD Hộ nông dân | completed | BR-001: sinh farmer_code, unique phone |
| phase-2-2 | Module FarmZone: Quản lý Vùng trồng & GPS | completed | BR-002: PostGIS GeoJSON, tính diện tích, chặn overlap |
| phase-3-1 | Module FarmingLog: Quản lý Vụ mùa (Season) | completed | BR-003: 1 vụ mùa ACTIVE / vùng trồng |
| phase-3-2 | Module FarmingLog: Nhật ký canh tác & Thu hoạch | todo | BR-003: Ràng buộc các loại vật tư, trigger COMPLETED |
| phase-4-1 | Module Warehouse: Tồn kho & Phiếu Nhập/Xuất | todo | BR-005: Chặn xuất âm, cảnh báo HSD |
| phase-5-1 | Module OCR: Xử lý hóa đơn Async với BullMQ | todo | BR-007: Trạng thái RAW -> CONFIRMED |
| phase-6-1 | Module CheckVN: Quản lý Lô hàng (Batch) | todo | BR-004: Validate weight với vụ mùa |
| phase-6-2 | Module CheckVN: Tích hợp QR Code Workflow | todo | BR-004: Gọi CheckVN API, cấp & kích hoạt QR |
| phase-7-1 | Module Carbon: Background Job tính toán Carbon | todo | BR-006: Emission factors, N2O, CO2 |
| phase-7-2 | Module Carbon: Xét duyệt & Cấp tín chỉ Carbon | todo | BR-006: Duyệt VERIFIED -> ISSUED |
| phase-8-1 | Module Reporting: Báo cáo tổng hợp Gov Viewer | todo | BR-008: Aggregate reports, Export Async |
| phase-8-2 | Module Notification: Hệ thống thông báo | todo | Báo khi OCR xong, Carbon cấp, hết hạn QR |

## Các Task Đã Thực Hiện (Execution Log)

| id | task | status | notes |
| --- | --- | --- | --- |
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
| task-17 | Create season.dto.ts with Zod schemas | completed | |
| task-18 | Create season.repository.ts | completed | |
| task-19 | Create season.service.ts with active season logic and checks | completed | |
| task-20 | Create season.controller.ts and router, mount in app.ts | completed | |
| task-21 | Update farming-log.dto.ts with dynamic conditional fields | completed | |
| task-22 | Update farming-log repository, service, controller, and router | completed | |
| task-23 | Write unit tests in season.test.ts | completed | |
| task-24 | Run backend tests and verify build | completed | |
| task-25 | Implement FrontEnd seasons/page.tsx Split View page | completed | |
| task-26 | Activate Season link card on Dashboard page.tsx | completed | |
| task-27 | Verify frontend build and perform manual verification | completed | |
<<<<<<< HEAD
| task-28 | Brainstorm & Design Farmer Redis Cache | completed | |
| task-29 | Write design doc for Farmer Redis Cache | completed | |
| task-30 | Implement Redis cache logic in farmer.service.ts | completed | |
| task-31 | Add unit/integration tests for farmer caching | completed | |
| task-32 | Verify implementation & benchmark latency | completed | |
=======
| task-28 | Update Sidebar.tsx role access for /warehouse | completed | |
| task-29 | Create helper components: TransactionTypeTag & StockAlertBanner | completed | |
| task-30 | Create component tables: MaterialTable & StockTable | completed | |
| task-31 | Create component tables: TransactionTable & ReconciliationTable | completed | |
| task-32 | Create modal: MaterialFormModal | completed | |
| task-33 | Create modal: ImportModal | completed | |
| task-34 | Create modal: ExportModal with expiration/stock verification | completed | |
| task-35 | Create modal: ReturnModal | completed | |
| task-36 | Build main Stock Page: app/(dashboard)/warehouse/page.tsx | completed | |
| task-37 | Build Materials Page: app/(dashboard)/warehouse/materials/page.tsx | completed | |
| task-38 | Build Transactions Page: app/(dashboard)/warehouse/transactions/page.tsx | completed | |
| task-39 | Build Reconciliation Page: app/(dashboard)/warehouse/reconciliation/page.tsx | completed | |
| task-40 | Run production build check on Web-Admin | completed | |
| task-41 | Run existing Web-Admin frontend tests | completed | |
| task-42 | Perform manual verification and write walkthrough | pending | |

>>>>>>> a329ae114216b23ffd3b5f4d296751b6884b6d9e
