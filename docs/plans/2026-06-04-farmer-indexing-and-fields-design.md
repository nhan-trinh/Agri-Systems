# Thiết kế: Tối ưu hóa Chỉ mục & Ràng buộc Hồ sơ Nông dân

Tài liệu này đặc tả thiết kế kỹ thuật phục vụ tối ưu hóa hiệu năng truy vấn cho bảng nông dân (`Farmer`) và xác định các trường dữ liệu bắt buộc/tùy chọn khi HTX Manager tạo hồ sơ.

---

## 1. Cấu hình các Trường dữ liệu Đăng ký
Các trường dữ liệu đầu vào khi thực hiện đăng ký nông dân mới (`POST /api/v1/farmers`):

| Tên trường | Kiểu dữ liệu | Trạng thái | Ghi chú / Quy tắc kiểm tra |
| :--- | :--- | :--- | :--- |
| `full_name` | String | **Bắt buộc** | Tối thiểu 2 ký tự. |
| `phone` | String | **Bắt buộc** | Unique. Khớp regex số điện thoại Việt Nam `03x, 05x, 07x, 08x, 09x`. |
| `address` | String | **Bắt buộc** | Địa chỉ liên hệ của nông dân. |
| `national_id` | String | Tùy chọn | Số CCCD/CMND (có thể bổ sung sau). |
| `date_of_birth` | DateTime | Tùy chọn | Ngày sinh (dạng chuỗi ngày ISO, có thể bổ sung sau). |
| `cooperative_id` | String | Tự động | Không nhập từ form. Tự động lấy từ token `HTX_MANAGER`. |

### Xử lý số điện thoại không hợp lệ
* Validator của Backend (Zod) sẽ từ chối các chuỗi không khớp biểu thức chính quy `/^0[35789]\d{8}$/`.
* Trả về lỗi `400 Bad Request` dạng chuẩn API kèm thông báo chi tiết lỗi tiếng Việt.

---

## 2. Thiết kế Đánh chỉ mục Cơ sở dữ liệu (Indexing)
Để tối ưu hóa các câu lệnh truy vấn danh sách nông dân theo HTX (vốn được chạy liên tục trong luồng nghiệp vụ của `HTX_MANAGER`), ta bổ sung chỉ mục đơn:

* **Target model**: `Farmer`
* **Target field**: `cooperative_id`
* **Database engine**: PostgreSQL index

### Prisma Schema Update
```prisma
model Farmer {
  id             String      @id @default(cuid())
  farmer_code    String      @unique
  full_name      String
  phone          String      @unique
  national_id    String?
  date_of_birth  DateTime?
  address        String
  cooperative_id String
  cooperative    Cooperative @relation(fields: [cooperative_id], references: [id])
  is_active      Boolean     @default(true)
  deleted_at     DateTime?
  created_at     DateTime    @default(now())
  updated_at     DateTime    @updatedAt
  farm_zones     FarmZone[]

  @@index([cooperative_id])
}
```

---

## 3. Kế hoạch xác minh (Verification Plan)
1. **Migration Check**: Chạy `npx prisma migrate dev` để đảm bảo sinh migration thành công tạo index trong database.
2. **Validator Check**: Gửi request `POST /api/v1/farmers` sai định dạng SĐT để kiểm tra mã lỗi và thông báo lỗi.
3. **Index Check**: Chạy `EXPLAIN ANALYZE` trên PostgreSQL để xác minh truy vấn lọc theo `cooperative_id` thực hiện index scan thay vì sequential scan.
