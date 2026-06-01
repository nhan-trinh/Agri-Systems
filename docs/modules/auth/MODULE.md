# Module: auth

## Mục đích
Xác thực người dùng (JWT), refresh token, đăng xuất, phân quyền RBAC.

## Endpoints

| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/api/v1/auth/login` | PUBLIC | Đăng nhập bằng SĐT + password |
| POST | `/api/v1/auth/refresh` | PUBLIC | Lấy access token mới từ refresh token |
| POST | `/api/v1/auth/logout` | Authenticated | Hủy refresh token |
| POST | `/api/v1/auth/change-password` | Authenticated | Đổi mật khẩu |
| POST | `/api/v1/auth/forgot-password` | PUBLIC | Gửi OTP reset qua SMS |
| POST | `/api/v1/auth/reset-password` | PUBLIC | Reset mật khẩu bằng OTP |

## DTOs

```typescript
LoginDto: { phone: string, password: string }
RefreshDto: { refresh_token: string }
ChangePasswordDto: { old_password: string, new_password: string (min 8) }
ForgotPasswordDto: { phone: string }
ResetPasswordDto: { phone: string, otp: string, new_password: string }
```

## Business Logic

- Đăng nhập: so sánh `bcrypt.compare(password, user.password_hash)`
- Access token: JWT expire 15 phút, payload: `{ sub: userId, role, cooperative_id, farmer_id }`
- Refresh token: JWT expire 30 ngày, lưu vào Redis với key `refresh:<userId>:<tokenId>`
- Logout: xóa refresh token khỏi Redis
- OTP reset: 6 chữ số, TTL 5 phút, lưu Redis `otp:<phone>`
- Sai OTP 3 lần liên tiếp → khóa 15 phút

## Prisma Schema liên quan

```prisma
model User {
  id            String   @id @default(cuid())
  phone         String   @unique
  password_hash String
  role          UserRole
  is_active     Boolean  @default(true)
  cooperative_id String?
  farmer_id     String?  @unique
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
}

enum UserRole {
  SUPER_ADMIN
  HTX_MANAGER
  FARMER
  WAREHOUSE_KEEPER
  GOV_VIEWER
}
```

## req.user shape (sau khi authenticate middleware)

```typescript
interface AuthUser {
  id: string;
  role: UserRole;
  cooperative_id: string | null;
  farmer_id: string | null;
}
```

## Business Rules liên quan
Xem `BUSINESS_RULES.md` — không có BR riêng cho auth, nhưng mọi module đều depend vào `req.user` từ đây.

## Dependencies
- `bcryptjs` — hash password
- `jsonwebtoken` — sign/verify JWT
- Redis — lưu refresh token + OTP
- Notification module — gửi SMS OTP
