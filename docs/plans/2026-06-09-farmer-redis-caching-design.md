# Thiết kế Caching cho Module Quản lý Nông dân (Farmer Caching Design)

**Ngày cập nhật:** 2026-06-09  
**Người thực hiện:** Antigravity  
**Module:** Farmer (Quản lý Nông dân)  
**Công nghệ:** Redis 7 (Cache-Aside Pattern)  

---

## 1. Mục tiêu & Chỉ số hiệu năng (KPI)
- Giảm thời gian phản hồi (latency) của API lấy danh sách nông dân (`GET /farmers`) từ ~200ms-1s xuống còn **< 50ms** đối với các lượt yêu cầu trúng cache (cache hit).
- Giảm tải truy vấn (query load) cho PostgreSQL.
- Đảm bảo tính nhất quán dữ liệu (consistency): Khi có thay đổi (thêm, sửa, đổi trạng thái nông dân), dữ liệu cache phải lập tức bị vô hiệu hóa (invalidate) để tránh dữ liệu bị lỗi/cũ (stale data).

---

## 2. Chiến lược Caching (Cache-Aside Pattern)

### 2.1 Cấu trúc Cache Key
Để phân biệt chính xác dữ liệu theo vai trò và quyền hạn (RBAC), cấu trúc key được định nghĩa như sau:

| Loại cache | Tên Key | Giải thích | TTL |
|---|---|---|---|
| **Danh sách (SUPER_ADMIN)** | `farmers:list:all` | Chứa tất cả nông dân trong hệ thống | 300 giây (5 phút) |
| **Danh sách (HTX_MANAGER)** | `farmers:list:coop:${cooperativeId}` | Chỉ chứa nông dân thuộc HTX quản lý tương ứng | 300 giây (5 phút) |
| **Chi tiết nông dân** | `farmers:detail:${farmerId}` | Chứa thông tin của một nông dân cụ thể | 300 giây (5 phút) |

### 2.2 Luồng đọc dữ liệu (Read Workflow)

#### Lấy danh sách nông dân (`getAllFarmers`)
1. Xác định vai trò của người dùng:
   - Nếu là `SUPER_ADMIN` $\rightarrow$ cache key = `farmers:list:all`.
   - Nếu là `HTX_MANAGER` $\rightarrow$ cache key = `farmers:list:coop:${user.cooperativeId}`.
2. Kiểm tra trong Redis bằng key trên.
   - **Cache Hit:** Parse dữ liệu JSON nhận được và trả về ngay.
   - **Cache Miss / Redis Error:**
     - Query dữ liệu từ PostgreSQL qua repository.
     - Lưu dữ liệu vừa lấy vào Redis dạng JSON với TTL 300 giây.
     - Trả về dữ liệu.

#### Lấy chi tiết nông dân (`getFarmerById`)
1. Xác định cache key: `farmers:detail:${id}`.
2. Kiểm tra trong Redis.
   - **Cache Hit:** Parse dữ liệu JSON nhận được.
   - **Cache Miss / Redis Error:**
     - Query dữ liệu từ PostgreSQL qua repository.
     - Lưu dữ liệu vào Redis dạng JSON với TTL 300 giây.
3. Thực hiện kiểm tra quyền (Permission Guard):
   - Đảm bảo `HTX_MANAGER` chỉ xem được nông dân thuộc cùng `cooperativeId` của họ. Nếu không hợp lệ $\rightarrow$ throw `AppError` (FORBIDDEN).
   - Trả về thông tin nông dân nếu kiểm tra quyền thành công.

---

## 3. Chiến lược Vô hiệu hóa Cache (Invalidation Workflow)

Để bảo đảm tính nhất quán của dữ liệu, cache phải được xóa ngay lập tức khi xảy ra bất cứ thay đổi nào:

### 3.1 Thêm nông dân mới (`createFarmer`)
1. Lưu bản ghi nông dân vào database thông qua Prisma.
2. Xóa các cache keys liên quan đến danh sách:
   - Xóa `farmers:list:all`
   - Xóa `farmers:list:coop:${data.cooperative_id}`

### 3.2 Cập nhật thông tin nông dân (`updateFarmer`)
1. Lấy thông tin nông dân hiện tại trước khi cập nhật (để biết HTX cũ của họ).
2. Lưu cập nhật nông dân vào database thông qua Prisma.
3. Xóa cache chi tiết: `farmers:detail:${id}`.
4. Xóa cache danh sách:
   - Xóa `farmers:list:all`
   - Xóa `farmers:list:coop:${old_cooperative_id}`
   - Nếu `cooperative_id` bị thay đổi (bởi SUPER_ADMIN) $\rightarrow$ xóa thêm `farmers:list:coop:${new_cooperative_id}`.

### 3.3 Thay đổi trạng thái nông dân (`toggleFarmerStatus`)
1. Thực hiện đổi trạng thái hoạt động (`is_active = !is_active`) trong database.
2. Xóa các cache liên quan:
   - Xóa chi tiết: `farmers:detail:${id}`
   - Xóa danh sách: `farmers:list:all` và `farmers:list:coop:${farmer.cooperative_id}`.

---

## 4. Khả năng chịu lỗi & Khắc phục (Fail-Safe)
- Toàn bộ lệnh gọi Redis (`redis.get`, `redis.set`, `redis.del`) được đặt trong block `try-catch`.
- Khi có ngoại lệ (Redis kết nối lỗi, timeout hoặc downtime), hệ thống sẽ ghi log cảnh báo (`console.error`) và tiếp tục chạy bình thường bằng cách truy vấn DB trực tiếp. Hành vi này giúp duy trì hoạt động ổn định của ứng dụng (Graceful Degradation).
