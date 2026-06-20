# Thiết kế giao diện (UI) module Số hóa tài liệu (OCR)

## 1. Tổng quan & Vai trò truy cập (RBAC)
- Khả dụng cho các vai trò: **SUPER_ADMIN**, **HTX_MANAGER**, và **WAREHOUSE_KEEPER**.
- Cần cập nhật [Sidebar.tsx](file:///d:/Downloads/agri-system/Web-Admin/src/components/shared/Sidebar.tsx) để mở rộng quyền truy cập đúng với phân quyền của Backend.

## 2. Giao diện Dashboard chính (`viewMode === 'DASHBOARD'`)
Giao diện chính gồm tiêu đề trang và 2 Tab chuyển đổi:
- **Tab 1: Tải lên tài liệu (`UPLOAD`)**
  - Dropzone kéo thả hỗ trợ PDF, JPG, PNG (tối đa 10 file, giới hạn 10MB/file).
  - Phần chọn tham số OCR:
    - Loại tài liệu (`document_hint`): Dropdown `AUTO` (mặc định), `FARMING_LOGBOOK`, `MATERIAL_INVOICE`.
    - Vụ mùa (`season_id`): Dropdown tải từ `GET /seasons`. Chỉ hiển thị nếu chọn `FARMING_LOGBOOK`.
  - Nút bấm **"Bắt đầu số hóa"** thực hiện gửi dữ liệu `multipart/form-data` lên `POST /ocr/batches`.
- **Tab 2: Lịch sử lô quét (`HISTORY`)**
  - Hiển thị danh sách các lô quét dưới dạng bảng phân trang (`GET /ocr/batches`).
  - Hỗ trợ xem chi tiết từng lô quét (Expandable Row) để liệt kê danh sách tệp tin (`OcrDocument`):
    - Trạng thái `AWAITING_REVIEW`: Nút **"Duyệt hồ sơ"** để mở màn hình chỉnh sửa/duyệt.
    - Trạng thái `ERROR`: Hiển thị lỗi + nút **"Thử lại"** (`POST /documents/:id/retry`).
    - Trạng thái `CONFIRMED`: Nhãn hiển thị **"Đã ghi sổ"**.
    - Trạng thái `REJECTED`: Nhãn hiển thị **"Đã từ chối"** kèm lý do.

## 3. Giao diện duyệt tài liệu Split-Screen (`viewMode === 'REVIEW'`)
Giao diện chia làm hai phần chính:
- **Bên trái (File Preview):**
  - Nếu tài liệu là PDF: Thẻ `<iframe src={file_preview_url} className="w-full h-full min-h-[600px] border-0" />`.
  - Nếu tài liệu là Ảnh (JPG, PNG): Thẻ `<img>` đi kèm bộ công cụ (Xoay ảnh, Phóng to/Thu nhỏ).
- **Bên phải (Editable Form):**
  - Form động hiển thị và cho phép chỉnh sửa `confirmed_data` của bản nháp:
    - **Thực thể `FARMING_LOG`:** Các thông tin ngày thực hiện, loại hoạt động, ghi chú, liên kết vật tư kho (`material_id`), và các trường động tương ứng với loại hoạt động (Bón phân, phun thuốc, tưới tiêu, gặt hái).
    - **Thực thể `WAREHOUSE_TRANSACTION`:** Các thông tin loại giao dịch (IMPORT/EXPORT), vật tư, ngày, ghi chú. Với nhập kho hiển thị đơn giá, nhà cung cấp, hóa đơn, hạn sử dụng. Với xuất kho hiển thị nông dân nhận, mục đích xuất.
  - Sát thực lỗi từ Zod: Ánh xạ lỗi từ `validation_errors` và hiển thị chữ đỏ bên dưới mỗi trường nhập tương ứng.
  - Thanh công cụ hành động phía dưới:
    - **Quay lại:** Trở về trang danh sách.
    - **Lưu nháp:** Gọi `PATCH /draft-records/:id` và cập nhật thông báo lỗi tức thì.
    - **Xác nhận ghi sổ:** Gọi `POST /draft-records/:id/confirm`, nếu thành công ghi sổ và quay về danh sách.
    - **Từ chối quét:** Gọi `POST /documents/:id/reject` yêu cầu nhập lý do từ chối tối thiểu 5 ký tự.

## 4. Danh sách các API Tích hợp
1. `GET /seasons`
2. `GET /warehouse/materials`
3. `GET /farmers`
4. `POST /ocr/batches`
5. `GET /ocr/batches`
6. `GET /ocr/documents/:id/review`
7. `PATCH /draft-records/:id`
8. `POST /draft-records/:id/confirm`
9. `POST /documents/:id/reject`
10. `POST /documents/:id/retry`
