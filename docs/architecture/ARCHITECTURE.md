# Kiến trúc hệ thống — AgriTrace Carbon

## Kiến trúc tổng thể: Modular Monolith

```
Client (Web/Mobile)
        │
        ▼
   Nginx (reverse proxy)
        │
        ▼
Express.js App  (:3000)
   ├── Middleware chain
   │     ├── helmet (security headers)
   │     ├── rate-limiter (Redis-backed)
   │     ├── cors
   │     ├── morgan (request logging)
   │     └── auth guard (JWT verify)
   │
   ├── /api/v1/auth          → module: auth
   ├── /api/v1/farmers       → module: farmer
   ├── /api/v1/farm-zones    → module: farm-zone
   ├── /api/v1/farming-logs  → module: farming-log
   ├── /api/v1/warehouse     → module: warehouse
   ├── /api/v1/qr            → module: checkvn-qr
   ├── /api/v1/carbon        → module: carbon
   ├── /api/v1/reports       → module: reporting
   ├── /api/v1/ocr           → module: ocr
   └── /public/trace/:qrCode → public trace (no auth)
        │
        ▼
   Service Layer (business logic)
        │
   ┌────┼────────────────────┐
   ▼    ▼                    ▼
PostgreSQL  MongoDB       Redis
(Prisma)   (Mongoose)    (Cache/Queue)
                              │
                          BullMQ workers
                          ├── checkvn-worker
                          ├── carbon-worker
                          └── ocr-worker
```

---

## Cấu trúc mỗi Module

Mỗi module trong `src/modules/<tên>/` tuân theo cấu trúc:

```
src/modules/farming-log/
├── farming-log.router.ts      ← Express Router, định nghĩa routes
├── farming-log.controller.ts  ← Nhận request, gọi service, trả response
├── farming-log.service.ts     ← Business logic thuần
├── farming-log.repository.ts  ← Truy vấn database (Prisma)
├── farming-log.dto.ts         ← Zod schemas cho request validation
├── farming-log.types.ts       ← TypeScript interfaces/types
└── farming-log.test.ts        ← Unit tests (Jest)
```

**Quy tắc nghiêm ngặt:**
- Controller không chứa business logic — chỉ gọi service
- Service không import Prisma trực tiếp — chỉ gọi repository
- Repository không chứa logic — chỉ CRUD thuần
- Mọi input đều qua Zod validation trước khi vào controller

---

## Luồng xử lý Request chuẩn

```
HTTP Request
    │
    ▼
[Middleware] helmet → cors → rate-limit → morgan
    │
    ▼
[Auth Guard] verify JWT → attach req.user
    │
    ▼
[Role Guard] kiểm tra req.user.role có quyền không
    │
    ▼
[Controller] nhận req, gọi dto.parse(req.body)
    │
    ▼  (nếu validation fail → 400 Bad Request tự động)
[Service] business logic, gọi repository
    │
    ▼
[Repository] Prisma query → PostgreSQL
    │
    ▼
[Response] chuẩn hóa qua responseHelper
```

---

## Cấu trúc Response chuẩn

Mọi API đều trả về format sau (xem `docs/architecture/API_CONVENTIONS.md`):

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 100, "limit": 20 }  // chỉ có khi paginate
}

// Error
{
  "success": false,
  "error": {
    "code": "FARMER_NOT_FOUND",
    "message": "Không tìm thấy hộ dân",
    "details": []  // validation errors nếu có
  }
}
```

---

## Shared Utilities (src/shared/)

| File | Mục đích |
|---|---|
| `middleware/auth.middleware.ts` | Verify JWT, attach `req.user` |
| `middleware/role.middleware.ts` | RBAC — kiểm tra role |
| `middleware/rateLimiter.ts` | Redis-backed rate limiting |
| `guards/ownership.guard.ts` | Kiểm tra resource thuộc về user |
| `pipes/validate.pipe.ts` | Zod validation wrapper |
| `interceptors/response.interceptor.ts` | Chuẩn hóa response |
| `utils/response.helper.ts` | `success()`, `error()`, `paginate()` |
| `utils/pagination.util.ts` | Parse page/limit từ query |
| `utils/gps.util.ts` | Convert tọa độ, tính diện tích PostGIS |
| `utils/date.util.ts` | Format date, kỳ vụ, season |
| `utils/crypto.util.ts` | Hash, encrypt cho API keys |

---

## Biến môi trường (.env)

```bash
# App
NODE_ENV=development
PORT=3000
API_VERSION=v1

# PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/agritrace

# MongoDB
MONGO_URL=mongodb://localhost:27017/agritrace_logs

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=<strong-secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CheckVN Integration
CHECKVN_API_URL=https://api.checkvn.vn/v1
CHECKVN_API_KEY=<from-checkvn>
CHECKVN_WEBHOOK_SECRET=<webhook-verify-secret>

# Meilisearch
MEILI_HOST=http://localhost:7700
MEILI_MASTER_KEY=<master-key>

# BullMQ
BULL_REDIS_URL=redis://localhost:6379

# File Storage (local hoặc S3)
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./uploads
# STORAGE_S3_BUCKET=...
# STORAGE_S3_REGION=...
```
