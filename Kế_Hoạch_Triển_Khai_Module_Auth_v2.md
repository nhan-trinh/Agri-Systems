# Kế Hoạch Triển Khai Module Auth (Tích hợp Zalo Mini App)

> **Phiên bản:** 2.0 — đã rà soát và sửa lỗi  
> **Người review:** AI Review  
> **Ngày cập nhật:** 2024

---

## ⚠️ Các Vấn Đề Đã Phát Hiện & Sửa

| # | Vấn đề gốc | Mức độ | Đã sửa |
|---|---|---|---|
| 1 | Dùng `getAccessToken()` — SAI SDK Zalo Mini App | 🔴 Nghiêm trọng | ✅ Đổi sang `getAuthCode()` |
| 2 | Endpoint `/auth/zalo/login` không nhất quán với convention `/auth/zalo-login` | 🟡 Trung bình | ✅ Chuẩn hóa |
| 3 | Thiếu luồng xử lý khi `zalo_id` chưa có trong DB — logic chưa rõ | 🔴 Nghiêm trọng | ✅ Định nghĩa rõ 2 case |
| 4 | Thiếu endpoint `GET /auth/me` trong danh sách API — có mention nhưng không có spec | 🟡 Trung bình | ✅ Bổ sung đầy đủ |
| 5 | Thiếu endpoint `POST /auth/logout` — refresh token cần được hủy | 🔴 Nghiêm trọng | ✅ Bổ sung |
| 6 | Thiếu xử lý `is_first_login` — đã thảo luận nhưng không có trong kế hoạch | 🟡 Trung bình | ✅ Bổ sung |
| 7 | Thiếu luồng đăng nhập Web Admin (SĐT + mật khẩu) cho HTX_MANAGER & SUPER_ADMIN | 🔴 Nghiêm trọng | ✅ Bổ sung song song |
| 8 | Schema thiếu field `refresh_token` / Redis key cho logout | 🟡 Trung bình | ✅ Bổ sung mô tả |
| 9 | Verification plan quá đơn giản — thiếu test cases cụ thể | 🟢 Nhỏ | ✅ Bổ sung |
| 10 | Biến môi trường `ZALO_APP_ID` / `ZALO_APP_SECRET` — ghi chú "(Nếu cần)" không rõ ràng | 🟢 Nhỏ | ✅ Làm rõ bắt buộc |

---

## 1. Kiến Trúc Auth Song Song (Quan trọng)

Hệ thống có **2 luồng đăng nhập song song** — không phải chỉ Zalo:

```
┌─────────────────────────────────────┐
│           Auth Module               │
│                                     │
│  Luồng A: Zalo Mini App             │
│  └─ Nông dân dùng app Zalo          │
│     POST /api/v1/auth/zalo-login    │
│                                     │
│  Luồng B: Web Admin (SĐT + password)│
│  └─ HTX_MANAGER, SUPER_ADMIN,       │
│     WAREHOUSE_KEEPER dùng Web       │
│     POST /api/v1/auth/login         │
└─────────────────────────────────────┘
```

> **Quyết định kiến trúc:** `password_hash` cho phép `NULL` — user đăng nhập qua Zalo không cần mật khẩu. User đăng nhập Web bắt buộc có `password_hash`.

---

## 2. Luồng Đăng Nhập Zalo (Đã Sửa)

### ❌ Sai (bản gốc)
```
Frontend gọi getAccessToken() → gửi access_token lên backend
```

### ✅ Đúng — Zalo Mini App dùng `getAuthCode()`, không phải `getAccessToken()`

```
Frontend (Zalo Mini App)
    │
    │  import { getAuthCode } from 'zmp-sdk'
    │  const { code } = await getAuthCode({ appId: ZALO_APP_ID })
    │
    ▼
POST /api/v1/auth/zalo-login
Body: { code: "auth_code_từ_zalo" }
    │
    ▼
Backend gọi Zalo OAuth2 để đổi code lấy access_token
    │  POST https://oauth.zaloapp.com/v4/oa/access_token
    │  Body: { app_id, app_secret, code, grant_type: "authorization_code" }
    │
    ▼
Dùng access_token gọi Zalo Graph API lấy profile
    │  GET https://graph.zalo.me/v2.0/me?fields=id,name,picture
    │  Header: access_token: <token>
    │
    ▼
Backend xử lý DB — 2 trường hợp:

  Case 1: zalo_id ĐÃ tồn tại trong DB
    └─ Tìm User, kiểm tra is_active = true
       └─ Sinh JWT → trả về 200

  Case 2: zalo_id CHƯA tồn tại trong DB
    └─ Kiểm tra số điện thoại (nếu Mini App xin quyền getPhoneNumber)
         Có SĐT:  tìm User theo phone → gắn zalo_id → đăng nhập
         Không SĐT: trả về 404 USER_NOT_FOUND (HTX Manager phải tạo
                    tài khoản cho nông dân trước)
    │
    ▼
Backend → Frontend: JWT (access_token 15p + refresh_token 30 ngày)
```

> **Lý do không tự động tạo user khi chưa có:** Nghiệp vụ yêu cầu HTX_MANAGER tạo tài khoản nông dân trước (BR-001). Nếu tự động tạo sẽ bypass kiểm soát này.

---

## 3. Danh Sách Endpoints Đầy Đủ (Đã Bổ Sung)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/api/v1/auth/zalo-login` | PUBLIC | Đăng nhập qua Zalo Mini App |
| POST | `/api/v1/auth/login` | PUBLIC | Đăng nhập Web Admin (SĐT + password) |
| POST | `/api/v1/auth/refresh` | PUBLIC | Lấy access token mới từ refresh token |
| POST | `/api/v1/auth/logout` | Authenticated | Hủy refresh token khỏi Redis |
| GET | `/api/v1/auth/me` | Authenticated | Lấy thông tin user hiện tại |
| POST | `/api/v1/auth/change-password` | Authenticated | Đổi mật khẩu (Web Admin) |
| POST | `/api/v1/auth/first-login-change-password` | Authenticated | Đổi MK lần đầu bắt buộc |
| POST | `/api/v1/auth/forgot-password` | PUBLIC | Gửi OTP SMS reset mật khẩu |
| POST | `/api/v1/auth/reset-password` | PUBLIC | Reset mật khẩu bằng OTP |

---

## 4. Cập Nhật Database Schema

### Bảng `User` — sửa và bổ sung

```prisma
model User {
  id             String    @id @default(cuid())
  phone          String?   @unique   // optional nếu chỉ đăng nhập Zalo
  password_hash  String?             // ✅ NULL cho Zalo user (đã sửa: bản gốc String bắt buộc)
  role           UserRole
  cooperative_id String?
  farmer_id      String?   @unique
  
  // ✅ Bổ sung cho Zalo Auth
  zalo_id        String?   @unique
  zalo_name      String?
  avatar_url     String?
  
  // ✅ Bổ sung is_first_login (thiếu trong bản gốc)
  is_first_login Boolean   @default(true)
  
  is_active      Boolean   @default(true)
  last_login_at  DateTime?
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt

  // Constraint: phải có ít nhất 1 trong 2 (phone hoặc zalo_id)
  // Enforce ở service layer: if (!phone && !zalo_id) throw error
}
```

> **Lưu ý quan trọng:** Prisma không hỗ trợ `CHECK constraint` trực tiếp. Validate logic `phone OR zalo_id bắt buộc có 1` phải đặt trong **service layer**, không phải schema.

### Redis Keys (bổ sung — bản gốc thiếu hoàn toàn)

```
refresh:<userId>:<tokenId>   TTL 30 ngày  — lưu refresh token
otp:<phone>                  TTL 5 phút   — OTP reset mật khẩu
otp_attempt:<phone>          TTL 15 phút  — đếm số lần sai OTP (max 3)
```

---

## 5. Cập Nhật Environment Variables

```bash
# JWT
JWT_SECRET="secret_key_manh_it_nhat_32_ky_tu"
JWT_EXPIRES_IN="15m"           # access token ngắn
JWT_REFRESH_EXPIRES_IN="30d"   # refresh token dài

# Zalo — BẮT BUỘC (không phải "nếu cần" như bản gốc)
ZALO_APP_ID="id_cua_mini_app"
ZALO_APP_SECRET="secret_cua_mini_app"
ZALO_OAUTH_URL="https://oauth.zaloapp.com/v4/oa/access_token"
ZALO_GRAPH_API_URL="https://graph.zalo.me/v2.0/me"
```

---

## 6. Cấu Trúc File Module Auth (Bổ Sung Chi Tiết)

```
src/modules/auth/
├── auth.router.ts          ← Express Router, mount tất cả endpoints
├── auth.controller.ts      ← Nhận request, gọi service, trả response
├── auth.service.ts         ← Business logic (login, logout, OTP...)
├── auth.repository.ts      ← Prisma queries (findByPhone, findByZaloId...)
├── auth.dto.ts             ← Zod schemas validation
├── auth.types.ts           ← Interface AuthUser, JwtPayload...
├── zalo.service.ts         ← Gọi Zalo OAuth + Graph API (tách riêng)
└── auth.test.ts            ← Unit tests
```

### `auth.dto.ts` — Zod schemas

```typescript
// Luồng Zalo
export const ZaloLoginDto = z.object({
  code: z.string().min(1),           // auth code từ Zalo SDK
})

// Luồng Web Admin
export const LoginDto = z.object({
  phone: z.string().regex(/^(0[3|5|7|8|9])+([0-9]{8})$/),
  password: z.string().min(8),
})

export const RefreshDto = z.object({
  refresh_token: z.string().min(1),
})

export const ChangePasswordDto = z.object({
  old_password: z.string().min(8),
  new_password: z.string().min(8),
  confirm_password: z.string().min(8),
}).refine(d => d.new_password === d.confirm_password, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirm_password"],
})

export const ForgotPasswordDto = z.object({
  phone: z.string().regex(/^(0[3|5|7|8|9])+([0-9]{8})$/),
})

export const ResetPasswordDto = z.object({
  phone: z.string().regex(/^(0[3|5|7|8|9])+([0-9]{8})$/),
  otp: z.string().length(6),
  new_password: z.string().min(8),
})
```

### `zalo.service.ts` — Gọi Zalo API

```typescript
export class ZaloService {
  // Đổi auth code → access token
  async exchangeCodeForToken(code: string): Promise<string> {
    const res = await axios.post(process.env.ZALO_OAUTH_URL, {
      app_id: process.env.ZALO_APP_ID,
      app_secret: process.env.ZALO_APP_SECRET,
      code,
      grant_type: 'authorization_code',
    })
    if (!res.data.access_token) throw new AppError('ZALO_AUTH_FAILED', 502)
    return res.data.access_token
  }

  // Lấy profile user từ Zalo Graph API
  async getUserProfile(accessToken: string): Promise<ZaloProfile> {
    const res = await axios.get(process.env.ZALO_GRAPH_API_URL, {
      params: { fields: 'id,name,picture' },
      headers: { access_token: accessToken },
    })
    return { zaloId: res.data.id, name: res.data.name, avatar: res.data.picture?.data?.url }
  }
}
```

### `auth.middleware.ts` — Guards

```typescript
// requireAuth: verify JWT, attach req.user
export const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return next(new AppError('UNAUTHORIZED', 401))
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload
    req.user = payload
    next()
  } catch {
    next(new AppError('UNAUTHORIZED', 401))
  }
}

// requireRole: RBAC
export const requireRole = (roles: UserRole[]) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return next(new AppError('FORBIDDEN', 403))
  next()
}

// requireFirstLogin: chặn vào app nếu chưa đổi mật khẩu lần đầu
export const requireFirstLogin = (req, res, next) => {
  if (req.user.is_first_login) return next(new AppError('FIRST_LOGIN_REQUIRED', 403))
  next()
}
```

---

## 7. Open Questions — Cần Xác Nhận

> Những câu hỏi này ảnh hưởng trực tiếp đến implementation, cần trả lời **trước khi code**.

| # | Câu hỏi | Tác động nếu chưa có câu trả lời |
|---|---|---|
| Q1 | Mini App có xin quyền `getPhoneNumber` không? | Ảnh hưởng Case 2 trong luồng Zalo — có tự map SĐT hay không |
| Q2 | Nông dân có cần đăng xuất trong Mini App không? | Có cần endpoint logout cho Zalo flow không |
| Q3 | SUPER_ADMIN có đăng nhập qua Zalo không? | Nếu không → `password_hash` bắt buộc cho SUPER_ADMIN |

---

## 8. Kế Hoạch Kiểm Thử (Bổ Sung Chi Tiết)

### Unit Tests — `auth.test.ts`

```typescript
describe('AuthService - Zalo Login', () => {
  it('✅ Case 1: zalo_id đã có → đăng nhập thành công, trả JWT')
  it('✅ Case 2: zalo_id chưa có, có SĐT → map user, trả JWT')
  it('❌ Case 3: zalo_id chưa có, không SĐT → 404 USER_NOT_FOUND')
  it('❌ Case 4: zalo_id có nhưng is_active = false → 403 ACCOUNT_INACTIVE')
  it('❌ Case 5: Zalo API trả lỗi → 502 ZALO_AUTH_FAILED')
})

describe('AuthService - Web Login', () => {
  it('✅ SĐT + password đúng → trả JWT + refresh token')
  it('❌ SĐT không tồn tại → 404')
  it('❌ Password sai → 401')
  it('❌ is_active = false → 403')
  it('✅ is_first_login = true → JWT có flag, FE redirect đổi mật khẩu')
})

describe('AuthService - OTP', () => {
  it('✅ Gửi OTP thành công → lưu Redis TTL 5 phút')
  it('❌ Sai OTP 3 lần → khóa 15 phút, throw OTP_LOCKED')
  it('❌ OTP hết hạn → throw OTP_EXPIRED')
})
```

### Manual Test với Postman

```bash
# Giả lập Zalo login (lấy auth code thật từ log Mini App)
POST /api/v1/auth/zalo-login
Body: { "code": "<auth_code_từ_zalo_sdk>" }
→ Expect: 200 + { access_token, refresh_token, user: { id, role, ... } }

# Test Web Admin login
POST /api/v1/auth/login
Body: { "phone": "0901234567", "password": "password123" }
→ Expect: 200 + JWT

# Test token hết hạn
POST /api/v1/auth/refresh
Body: { "refresh_token": "..." }
→ Expect: 200 + access_token mới
```

---

## 9. Error Codes Module Auth

| Code | HTTP | Mô tả |
|---|---|---|
| `UNAUTHORIZED` | 401 | Token thiếu hoặc hết hạn |
| `FORBIDDEN` | 403 | Không đủ quyền |
| `FIRST_LOGIN_REQUIRED` | 403 | Phải đổi mật khẩu trước khi dùng app |
| `ACCOUNT_INACTIVE` | 403 | Tài khoản bị khóa |
| `USER_NOT_FOUND` | 404 | Zalo ID chưa được tạo tài khoản trong hệ thống |
| `INVALID_CREDENTIALS` | 401 | SĐT hoặc mật khẩu sai |
| `OTP_EXPIRED` | 422 | OTP đã hết hạn (5 phút) |
| `OTP_INVALID` | 422 | OTP sai |
| `OTP_LOCKED` | 429 | Sai 3 lần, khóa 15 phút |
| `ZALO_AUTH_FAILED` | 502 | Lỗi khi gọi Zalo API |
| `PHONE_REQUIRED` | 422 | Cần cấp quyền SĐT trong Zalo Mini App |
