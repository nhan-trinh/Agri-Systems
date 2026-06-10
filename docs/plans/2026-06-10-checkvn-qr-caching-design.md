# Thiết kế Tích hợp CheckVN & Quản lý Lô hàng, Mã QR (Batch & CheckVN QR Caching Design)

**Ngày cập nhật:** 2026-06-10  
**Người thực hiện:** Antigravity  
**Module:** `checkvn-qr`  
**Công nghệ:** Redis 7 (Cache-Aside), NestJS/Express, Prisma ORM, HMAC-SHA256 Security  

---

## 1. Mục tiêu & Chỉ số hiệu năng (KPI)
- Xây dựng luồng đóng gói lô hàng và tích hợp dịch vụ CheckVN cấp mã QR truy xuất nguồn gốc.
- Đảm bảo tính bảo mật Webhook tuyệt đối (NFR-02): Xác thực chữ ký HMAC-SHA256 cho mọi request callback gửi về hệ thống từ CheckVN.
- Đáp ứng hiệu năng tải trang tra cứu công khai (NFR-05): Tải trang truy xuất nguồn gốc dưới 2 giây bằng cách sử dụng Redis Cache với thời gian sống (TTL) 5 phút.
- Đảm bảo tính bất biến của mã QR sau khi đã kích hoạt hoặc thu hồi (NFR-04).

---

## 2. API Endpoints & Phân quyền (RBAC)

Tất cả các route ngoại trừ webhook và trang tra cứu công khai đều yêu cầu quyền hạn `HTX_MANAGER` hoặc `SUPER_ADMIN`.

| HTTP Method | Route | Phân quyền | Mô tả |
|---|---|---|---|
| **`GET`** | `/api/v1/qr/batches` | `HTX_MANAGER`, `SUPER_ADMIN` | Lấy danh sách lô hàng. HTX Manager chỉ xem được lô thuộc HTX mình. |
| **`GET`** | `/api/v1/qr/batches/:id` | `HTX_MANAGER`, `SUPER_ADMIN` | Lấy chi tiết thông tin một lô hàng. |
| **`POST`** | `/api/v1/qr/batches` | `HTX_MANAGER` | Tạo lô hàng mới từ vụ mùa canh tác đã hoàn thành (`COMPLETED`). |
| **`POST`** | `/api/v1/qr/batches/:id/request` | `HTX_MANAGER` | Yêu cầu cấp QR sang CheckVN. Trả về `202 Accepted` và kích hoạt mock background callback. |
| **`POST`** | `/api/v1/qr/webhook` | `Public` (No Auth) | Webhook tiếp nhận danh sách mã QR do CheckVN cấp, kiểm tra chữ ký HMAC. |
| **`GET`** | `/api/v1/qr/batches/:id/qr` | `HTX_MANAGER` | Lấy danh sách mã QR và link truy xuất tương ứng của lô hàng. |
| **`POST`** | `/api/v1/qr/batches/:id/activate` | `HTX_MANAGER` | Kích hoạt lô hàng và toàn bộ dải mã QR đi kèm (yêu cầu `activation_note`). |
| **`POST`** | `/api/v1/qr/batches/:id/recall` | `HTX_MANAGER` | Thu hồi lô hàng và dải QR (yêu cầu `recall_reason`). |
| **`GET`** | `/api/v1/qr/public/trace/:qrCode` | `Public` (No Auth) | Trang tra cứu thông tin nguồn gốc công khai cho người tiêu dùng. |

---

## 3. Ràng buộc Nghiệp vụ & Trạng thái (Business Rules)

### 3.1 Quy trình vòng đời Lô hàng & QR (Lifecycle States)
```
[DRAFT] ──(Yêu cầu cấp)──> [PENDING_QR] ──(Webhook Callback)──> [QR_RECEIVED] (QR: INACTIVE)
                                 │
                                 ├──(Kích hoạt)──> [ACTIVE] (QR: ACTIVE)
                                 │
                                 └──(Thu hồi)──> [RECALLED] (QR: RECALLED)
```

1. **Tạo Lô hàng (`createBatch`):**
   - Vụ mùa (`season_id`) gán cho lô hàng phải có trạng thái `SeasonStatus.COMPLETED`.
   - Một vụ mùa chỉ được tạo tối đa 1 lô hàng.
   - Khối lượng lô hàng (`total_weight_kg`) $\le$ sản lượng thu hoạch thực tế (`actual_yield_kg`).
   - Mã lô hàng `batch_code` tự sinh định dạng: `${FARM_ZONE_CODE}-${YYYYMMDD}-${NNN}` (ví dụ: `ZONEA-20260610-001`).
2. **Kích hoạt Lô hàng (`activateBatch`):**
   - Chỉ được kích hoạt khi lô hàng có trạng thái `QR_RECEIVED`.
   - Bắt buộc điền `activation_note`.
   - Lô hàng chuyển sang `ACTIVE` và toàn bộ dải mã QR thuộc lô hàng chuyển từ `INACTIVE` sang `ACTIVE`.
3. **Thu hồi Lô hàng (`recallBatch`):**
   - Có thể thu hồi từ trạng thái bất kỳ.
   - Bắt buộc điền `recall_reason`.
   - Lô hàng chuyển sang `RECALLED` và toàn bộ dải mã QR chuyển sang `RECALLED`.
   - *NFR-04:* Khi QR đã ở trạng thái `ACTIVE` hoặc `RECALLED` thì không thể đổi về `INACTIVE` được nữa.

---

## 4. Bảo mật Webhook & Giả lập Bất đồng bộ (HMAC & Mocking)

### 4.1 Xác thực chữ ký HMAC-SHA256
- Khóa bí mật: `CHECKVN_WEBHOOK_SECRET` cấu hình trong `.env`.
- Header chứa chữ ký: `x-checkvn-signature`.
- Cách tính chữ ký:
  ```typescript
  import crypto from 'crypto';
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  ```
- Kiểm tra tính nhất quán chữ ký bằng `crypto.timingSafeEqual` để tránh timing attack. Nếu sai chữ ký $\rightarrow$ Trả về `401 Unauthorized`.

### 4.2 Giả lập Async Callback từ CheckVN (Phương án 2: Background Task)
Khi HTX Manager gọi gửi yêu cầu (`POST /batches/:id/request`):
1. Chuyển trạng thái lô hàng thành `PENDING_QR`.
2. Trả ngay HTTP `202 Accepted` kèm mock `checkvn_batch_id`.
3. Chạy `setTimeout` sau 2 giây:
   - Sinh dải mã QR theo số lượng yêu cầu (định dạng `QR-${batch_code}-${index}`).
   - Gửi POST request bằng `axios` tới webhook `/api/v1/qr/webhook` của hệ thống.
   - Ký payload bằng `CHECKVN_WEBHOOK_SECRET` và đặt vào header `x-checkvn-signature`.
   - Webhook tiếp nhận, verify chữ ký, thực hiện idempotency check (chỉ tiếp nhận nếu lô hàng đang ở `PENDING_QR`) rồi lưu dải mã QR dưới trạng thái `INACTIVE` và đổi trạng thái lô sang `QR_RECEIVED`.

---

## 5. Dữ liệu Truy xuất Nguồn gốc & Caching Redis

### 5.1 Dữ liệu truy xuất nguồn gốc công khai (`GET /public/trace/:qrCode`)
Tổ chức payload trả về chứa đầy đủ thông tin:
- **Lô hàng:** tên, mã, khối lượng, ngày kích hoạt.
- **HTX sản xuất:** tên, địa chỉ chi tiết.
- **Vùng trồng:** tên, diện tích, tọa độ ranh giới bản đồ (GeoJSON boundary).
- **Vụ mùa:** giống cây canh tác, ngày gieo sạ, ngày gặt, sản lượng thực tế.
- **Nông dân:** Chỉ hiển thị họ tên (Họ tên nông dân phụ trách). **Ẩn hoàn toàn số điện thoại và national_id**.
- **Nhật ký canh tác:** Danh sách hoạt động canh tác thực địa kèm hình ảnh (`FarmingLog[]`).
- **Chỉ số Carbon:** Phát thải ròng và trạng thái chứng nhận tín chỉ carbon (nếu có).

### 5.2 Cơ chế Caching Redis
- **Cache Key:** `qr:trace:${qrCode}`
- **TTL:** 300 giây (5 phút).
- **Luồng Cache-Aside:**
  - Nhận yêu cầu $\rightarrow$ Lấy từ Redis $\rightarrow$ Trả về ngay nếu có cache.
  - Nếu không có cache $\rightarrow$ Query Postgres $\rightarrow$ Lưu Redis với TTL 5 phút $\rightarrow$ Trả về.
- **Vô hiệu hóa Cache (Invalidation):**
  - Khi thu hồi lô hàng (`recallBatch`): Ngay khi lưu DB thành công, hệ thống sẽ xóa sạch cache keys `qr:trace:${qrCode.code}` của tất cả mã QR trong lô hàng này. Điều này đảm bảo người tiêu dùng quét mã QR sẽ nhận được thông tin thu hồi ngay lập tức.
