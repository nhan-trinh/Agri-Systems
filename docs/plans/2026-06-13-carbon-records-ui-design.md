# Thiết kế Giao diện Báo cáo và Chứng nhận Carbon (Carbon Records UI Design)

**Ngày cập nhật:** 2026-06-13  
**Người thực hiện:** Antigravity  
**Module:** `carbon-ui`  
**Công nghệ:** Next.js 14 App Router, TypeScript, Tailwind CSS, Heroicons/Lucide, Axios API Client

---

## 1. Mục tiêu & Luồng Trải nghiệm Người dùng (UX)
- Cung cấp giao diện trực quan cho cả 3 nhóm vai trò: `SUPER_ADMIN`, `HTX_MANAGER`, và `GOV_VIEWER` để giám sát chỉ số phát thải carbon thực tế từ các vụ mùa canh tác.
- Tích hợp bộ lọc trạng thái và tìm kiếm nâng cao theo thời gian thực.
- Triển khai modal phân tích chi tiết công thức tính toán lượng carbon phát thải và hấp thụ để đảm bảo tính minh bạch tối đa.
- Triển khai cơ chế tải chứng chỉ PDF chạy nền (Background Polling) tránh việc chặn hoặc làm đơ trình duyệt của người dùng khi tạo tài liệu lớn.

---

## 2. API Endpoints Kết nối
Các API từ Backend Carbon module được kết nối bao gồm:

| HTTP Method | API Route | Quyền truy cập | Mô tả |
|---|---|---|---|
| **`GET`** | `/api/v1/carbon/records` | `SUPER_ADMIN`, `HTX_MANAGER`, `GOV_VIEWER` | Lấy danh sách bản ghi Carbon phân trang. Tự động lọc theo HTX nếu là `HTX_MANAGER`. |
| **`GET`** | `/api/v1/carbon/records/:id` | `SUPER_ADMIN`, `HTX_MANAGER` | Xem chi tiết bản ghi carbon và cấu trúc bảng kê tính toán. |
| **`POST`** | `/api/v1/carbon/records/:id/verify` | `SUPER_ADMIN` | Xác minh bản ghi carbon (`DRAFT` -> `VERIFIED`). |
| **`POST`** | `/api/v1/carbon/records/:id/issue` | `SUPER_ADMIN` | Phát hành tín chỉ carbon (`VERIFIED` -> `ISSUED`), sinh mã số chứng nhận. |
| **`GET`** | `/api/v1/carbon/records/:id/certificate` | `SUPER_ADMIN`, `HTX_MANAGER` | Yêu cầu tạo chứng chỉ PDF. Trả về `202 Accepted` kèm ID của `ExportJob`. |
| **`GET`** | `/api/v1/carbon/export-jobs/:jobId` | `SUPER_ADMIN`, `HTX_MANAGER` | Kiểm tra trạng thái của tiến trình xuất file PDF (`PENDING`, `COMPLETED`, `FAILED`). |

---

## 3. Kiến trúc Frontend & Giao diện

### 3.1 Bảng Danh sách Bản ghi Carbon
- **Thanh tìm kiếm & Bộ lọc (Filters)**:
  - Bộ lọc Tabs: *Tất cả*, *Bản nháp (DRAFT)*, *Đã xác minh (VERIFIED)*, *Đã cấp tín chỉ (ISSUED)*.
  - Tìm kiếm nhanh: Cho phép tìm theo Tên vụ mùa, Mã vùng trồng, Tên nông dân phụ trách.
- **Dữ liệu hiển thị trên bảng**:
  - Tên vụ mùa (Giống cây).
  - Vùng trồng & Nông dân phụ trách.
  - Lượng phát thải ($kgCO_2e$) & Lượng hấp thụ ($kgCO_2$).
  - Carbon ròng giảm thiểu ($tCO_2e$) = $(Emission - Sequestration) / 1000$.
  - Trạng thái: Badge màu sắc (DRAFT: Vàng, VERIFIED: Xanh dương, ISSUED: Xanh lá).
  - Mã chứng nhận (nếu đã cấp).
- **Thao tác nghiệp vụ (Actions column)**:
  - Nút **Xem chi tiết** (Hiển thị cho tất cả).
  - Nút **Xác minh** (Chỉ hiện cho `SUPER_ADMIN` và trạng thái `DRAFT`).
  - Nút **Cấp tín chỉ** (Chỉ hiện cho `SUPER_ADMIN`, trạng thái `VERIFIED`, và Carbon ròng âm).
  - Nút **Tải chứng nhận** (Hiện cho `SUPER_ADMIN`, `HTX_MANAGER` khi trạng thái là `ISSUED`).

### 3.2 Modal Chi tiết Tính toán Phát thải (Details Modal)
Khi click vào dòng bản ghi, modal hiển thị thông tin chia làm 2 tab chính:
1. **Tab 1: Tổng quan số liệu (Overview)**:
   - Thống kê dạng thẻ lớn: Lượng phát thải thực tế, Lượng hấp thụ ròng, Lượng carbon giảm thiểu.
   - Thanh tiến trình so sánh tỉ lệ Phát thải / Hấp thụ.
   - Nhật ký lịch sử: Người duyệt xác minh, người cấp chứng nhận kèm mốc thời gian chi tiết.
2. **Tab 2: Chi tiết bảng kê vật tư sử dụng (Breakdown)**:
   - **Bảng 1: Phân bón sử dụng (Fertilizers)**: Tên phân bón, Tổng lượng bón ($kg$), Hệ số phát thải ($kgCO_2e/kg$), Tổng phát thải quy đổi ($kgCO_2e$).
   - **Bảng 2: Thuốc BVTV (Pesticides)**: Tên thuốc, Tổng lượng sử dụng ($lit$), Hệ số phát thải ($kgCO_2e/lit$), Tổng phát thải quy đổi ($kgCO_2e$).
   - **Bảng 3: Hấp thụ thu hoạch (Harvest Sequestration)**: Loại nông sản, Sản lượng thu hoạch ($kg$), Hệ số hấp thụ, Lượng carbon hấp thụ ($kgCO_2$).

### 3.3 Cơ chế Polling tải PDF chạy nền (Background PDF Polling)
Để tránh đơ trình duyệt và cải thiện trải nghiệm:
1. Người dùng nhấn nút **Tải chứng nhận**.
2. Frontend gọi API khởi tạo `GET /api/v1/carbon/records/:id/certificate` nhận về `exportJobId`.
3. Frontend lưu ID công việc vào state `pollingJobs` và bắt đầu chạy hàm polling:
   - Cứ mỗi 1.5 giây gọi API `GET /api/v1/carbon/export-jobs/:jobId`.
   - Trong lúc tải, nút "Tải chứng nhận" chuyển thành biểu tượng Spinner nhỏ và hiện Toast thông báo nền: *"Đang tạo chứng chỉ PDF..."*.
   - Nếu phản hồi trả về trạng thái `COMPLETED`: Frontend tự động kích hoạt download từ `download_url`, tắt Spinner và hiện Toast thành công: *"Tải chứng nhận thành công!"*.
   - Nếu trạng thái trả về `FAILED` hoặc lỗi: Tắt Spinner, hiện Toast cảnh báo lỗi: *"Tạo chứng nhận thất bại, vui lòng thử lại."*.

---

## 4. Kế hoạch Kiểm thử (Verification Plan)
- **Kiểm thử logic RBAC**:
  - Dùng tài khoản `HTX_MANAGER` đăng nhập: Kiểm tra xem các nút "Xác minh" và "Phát hành" có bị ẩn hoàn toàn hay không, và danh sách bản ghi có được giới hạn đúng trong HTX hay không.
  - Dùng tài khoản `SUPER_ADMIN` đăng nhập: Kiểm tra đầy đủ tính năng và các nút bấm phê duyệt.
- **Kiểm thử bất đồng bộ Polling**:
  - Nhấp tải chứng nhận và kiểm tra trong tab Network xem các request polling `/export-jobs/:jobId` có được gọi liên tục mỗi 1.5s và tự ngắt khi tải file thành công hay không.
