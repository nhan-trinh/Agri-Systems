# Thiết kế UI/UX Phase 4: Lô hàng & QR Code CheckVN

Tài liệu này đặc tả thiết kế giao diện (UI) và trải nghiệm người dùng (UX) cho Phase 4 của dự án **AgriTrace Carbon** dành cho vai trò **HTX Manager**.

## 1. Yêu cầu Nghiệp vụ & Giao diện
* **Mục tiêu**: Đóng gói nông sản sau khi thu hoạch vụ mùa thành các lô hàng (`Batch`), kết nối với hệ thống CheckVN để xin cấp dải mã QR truy xuất nguồn gốc, in tem dán lên bao bì và kích hoạt hoặc thu hồi dải mã QR khi cần thiết.
* **Quyền hạn**: Chỉ tài khoản thuộc vai trò `HTX_MANAGER` mới có quyền tạo lô hàng, yêu cầu cấp QR, kích hoạt và thu hồi. Dữ liệu phải được tự động lọc theo `cooperative_id` của HTX hiện tại (đã được xử lý ở backend).

---

## 2. Bố cục Giao diện (Layout)
Trang quản lý sẽ sử dụng bố cục **Split-Screen (Chia đôi màn hình)** để đồng bộ phong cách với giao diện *Theo dõi Vụ mùa*.

```
+-----------------------------------------------------------------------------------+
|  [Tiêu đề: Quản lý Lô hàng & Mã QR]                        [+ Tạo Lô Hàng Mới]    |
+-----------------------------------------------------------------------------------+
|  TÌM KIẾM & LỌC TRẠNG THÁI                                                        |
+------------------------------------+----------------------------------------------+
|  DANH SÁCH LÔ HÀNG (Cột trái 5/12) |  CHI TIẾT LÔ HÀNG & TRÌNH QUẢN LÝ QR         |
|                                    |  (Cột phải 7/12)                             |
|  [Thẻ Lô hàng 1] (Active)          |                                              |
|  - Mã: BATCH-01                    |  - Tên lô hàng: Lô lúa ST25 tháng 6          |
|  - Vụ: Vụ Hè Thu ST25              |  - Mã lô hàng: COOP1-20260612-001            |
|                                    |  - Khối lượng: 4,500 kg (Đóng gói: Bao 50kg) |
|  [Thẻ Lô hàng 2] (Draft)           |  - Vụ mùa: Vụ Hè Thu ST25 (Nông dân: Nguyễn Văn A) |
|  - Mã: BATCH-02                    |  - Mô tả: ...                                |
|  - Vụ: Vụ Đông Xuân Nàng Hoa       |  ------------------------------------------- |
|                                    |  TRẠNG THÁI CHECKVN: ĐÃ NHẬN MÃ QR           |
|                                    |  [Nút: Kích Hoạt QR] [Nút: Thu Hồi Lô Hàng]  |
|                                    |  ------------------------------------------- |
|                                    |  DANH SÁCH MÃ QR (Lưới hiển thị)             |
|                                    |  +-----+  +-----+  +-----+  +-----+  +-----+ |
|                                    |  | [QR] |  | [QR] |  | [QR] |  | [QR] |  | [QR] | |
|                                    |  +-----+  +-----+  +-----+  +-----+  +-----+ |
|                                    |  [Nút: In danh sách Tem QR]                  |
+------------------------------------+----------------------------------------------+
```

### A. Cột bên trái: Danh sách lô hàng
* **Bộ lọc và tìm kiếm**: 
  * Ô tìm kiếm hỗ trợ lọc theo Tên lô hàng và Mã lô hàng.
  * Dropdown lọc trạng thái: Nháp (`DRAFT`), Đang chờ QR (`PENDING_QR`), Đã nhận QR (`QR_RECEIVED`), Đang kích hoạt (`ACTIVATING`), Kích hoạt (`ACTIVE`), Đã thu hồi (`RECALLED`).
* **Danh sách thẻ (Cards)**:
  * Mỗi thẻ hiển thị các thông tin rút gọn: Tên lô hàng, mã lô hàng, tên vụ mùa liên quan, khối lượng, và thời gian tạo.
  * Huy hiệu trạng thái với màu sắc tương ứng:
    * `DRAFT`: Huy hiệu màu xám.
    * `PENDING_QR` & `ACTIVATING`: Huy hiệu màu xanh dương kèm hiệu ứng nhấp nháy chuyển động (pulse).
    * `QR_RECEIVED`: Huy hiệu màu cam/vàng.
    * `ACTIVE`: Huy hiệu màu xanh lá cây đậm.
    * `RECALLED`: Huy hiệu màu đỏ.

### B. Cột bên phải: Chi tiết lô hàng & Trình quản lý QR
* **Thông tin chung**: Hiển thị chi tiết về lô hàng, vụ mùa xuất xứ, hộ nông dân sản xuất, sản lượng thực tế và đơn vị đóng gói.
* **Quản lý Vòng đời CheckVN (Vận hành trạng thái)**:
  * **Trạng thái `DRAFT`**: Hiển thị nút **"Yêu cầu cấp QR (CheckVN)"**. Khi nhấn nút này, hệ thống sẽ thực hiện gọi API `POST /api/v1/qr/batches/:id/request` để gửi yêu cầu đến CheckVN. Trạng thái lô hàng sẽ chuyển sang `PENDING_QR`.
  * **Trạng thái `PENDING_QR`**: Hiển thị giao diện chờ kèm nút làm mới trạng thái (Refresh) để cập nhật thông tin nếu Webhook từ CheckVN phản hồi chậm.
  * **Trạng thái `QR_RECEIVED`**: Hiển thị danh sách các mã QR đã được CheckVN cấp phát và lưu trong hệ thống. Cung cấp nút **"Kích hoạt dải QR"** để mở Drawer/Modal nhập ghi chú kích hoạt (`activation_note`), sau đó gọi API `POST /api/v1/qr/batches/:id/activate`.
  * **Trạng thái `ACTIVE`**: Dải QR hoạt động bình thường, người tiêu dùng quét mã sẽ truy xuất được nguồn gốc. Giao diện hiển thị thêm nút **"Thu hồi lô hàng"** dành cho trường hợp phát hiện sự cố chất lượng nông sản. Nút thu hồi yêu cầu nhập lý do thu hồi (`recall_reason` tối thiểu 5 ký tự) trước khi gọi API `POST /api/v1/qr/batches/:id/recall`.
  * **Trạng thái `RECALLED`**: Hiển thị nhãn thu hồi nổi bật màu đỏ cùng thông tin thời gian thu hồi và lý do thu hồi. Các mã QR lúc này cũng hiển thị trạng thái vô hiệu hóa.
* **Xem mã QR & In tem**:
  * Hiển thị danh sách mã QR dưới dạng lưới hình ảnh nhỏ.
  * Khi nhấn vào một phần tử QR, hiển thị một Modal phóng to ảnh QR kèm đường dẫn liên kết dạng: `https://check.gov.vn/...` để kiểm tra trực quan.
  * Cung cấp nút **"In Tem QR"** mở ra một trang in hoặc định dạng trang in bằng CSS `@media print` giúp HTX Manager dễ dàng in trực tiếp ra máy in tem.

### C. Modal tạo lô hàng mới
* **Form tạo lô hàng** bao gồm các trường:
  * *Vụ mùa*: Dropdown hiển thị danh sách các vụ mùa đã hoàn thành (`COMPLETED`) và chưa được liên kết với lô hàng nào.
  * *Tên lô hàng*: Tự động đề xuất theo định dạng `Lô hàng - [Tên Vụ Mùa]` nhưng cho phép chỉnh sửa.
  * *Đơn vị đóng gói*: Ví dụ: "Bao 50kg", "Thùng 12 chai", v.v.
  * *Khối lượng lô hàng (kg)*: Trường nhập số dương. **Ràng buộc quan trọng**: Khi chọn vụ mùa, hệ thống sẽ truy xuất sản lượng thực tế thu hoạch của vụ mùa đó (ví dụ: `5,000 kg`) và đặt làm giới hạn tối đa cho trường nhập. Nếu người dùng nhập quá giới hạn này, form sẽ lập tức hiển thị cảnh báo đỏ và khóa nút gửi.
  * *Số lượng tem QR yêu cầu*: Từ 1 đến 10,000.
  * *Mô tả sản phẩm*: Ô nhập văn bản tùy chọn.

---

## 3. Tích hợp API và Quản lý Trạng thái (Integration & State)
Sử dụng thư viện `apiClient` từ `@/lib/api/axios` để giao tiếp với Backend:

1. **Lấy danh sách lô hàng**: `GET /qr/batches`
2. **Tạo lô hàng**: `POST /qr/batches` (payload chứa `season_id`, `batch_name`, `total_weight_kg`, `quantity_qr`, `packaging_unit`, `product_description`)
3. **Chi tiết lô hàng**: `GET /qr/batches/:id`
4. **Yêu cầu cấp QR CheckVN**: `POST /qr/batches/:id/request`
5. **Lấy danh sách mã QR của lô**: `GET /qr/batches/:id/qr-codes`
6. **Kích hoạt dải QR**: `POST /qr/batches/:id/activate` (payload chứa `activation_note`)
7. **Thu hồi lô hàng**: `POST /qr/batches/:id/recall` (payload chứa `recall_reason`)
8. **Lấy danh sách vụ mùa chưa gán lô**: `GET /seasons` (lọc cục bộ các vụ mùa có `status === 'COMPLETED'` và không có quan hệ `batch` đi kèm).
