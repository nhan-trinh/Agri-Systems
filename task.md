# AgriTrace Carbon - Kế hoạch triển khai Web Admin

Đây là lộ trình triển khai chi tiết các tính năng của Web Admin phân tách thành 5 Phase nhỏ để làm dần. Cập nhật tiến độ bằng cách đánh dấu `[x]` khi hoàn thành.

---

## 📅 PHẦN I: AUTHENTICATION (ĐÃ HOÀN THÀNH)
- [x] Task 1.1: Giao diện Đăng nhập đẹp mắt, sử dụng font chữ Fraunces + Plus Jakarta Sans, tông màu Xanh - Trắng.
- [x] Task 1.2: Thiết lập Axios Interceptor đính kèm Token và xử lý tự động gia hạn token (Silent Refresh).
- [x] Task 1.3: Giao diện & Xử lý luồng bắt buộc đổi mật khẩu lần đầu (`isFirstLogin: true`).
- [x] Task 1.4: Tích hợp định tuyến bảo vệ trang (`AuthGuard`) và giải phóng xung đột route.

---

## 🚀 PHASE 1: CƠ SỞ HẠ TẦNG UI & ONBOARDING (SUPER_ADMIN & HTX_MANAGER)
*Mục tiêu: Xây dựng bộ khung ứng dụng, quản lý hợp tác xã, cấu hình hệ số và chuẩn bị hộ nông dân.*

- [ ] **Task 1: Giao diện Dashboard khung (Common Layout)**
  - [ ] Thiết kế Sidebar điều hướng, Header hiển thị thông tin user và nút Đăng xuất.
  - [ ] Tích hợp phân quyền người dùng (RBAC) để ẩn/hiện menu tương ứng với vai trò (SUPER_ADMIN, HTX_MANAGER, WAREHOUSE_KEEPER, GOV_VIEWER).
- [ ] **Task 2: Quản lý Hợp tác xã (SUPER_ADMIN)**
  - [ ] Giao diện danh sách HTX tham gia hệ thống.
  - [ ] Form thêm mới, sửa đổi thông tin HTX (mã HTX_CODE, tên, địa chỉ, tỉnh, huyện, xã).
- [ ] **Task 3: Cấu hình Hệ số phát thải Carbon (SUPER_ADMIN)**
  - [ ] Giao diện cấu hình các chỉ số phát thải của phân đạm, thuốc bảo vệ thực vật (lưu vào database, không hardcode).
  - [ ] Quản lý lịch sử thay đổi hệ số.
- [ ] **Task 4: Quản lý tài khoản Nông dân (HTX_MANAGER)**
  - [ ] Form tạo mới hồ sơ nông dân (tự động sinh mã `farmer_code` theo định dạng `HTX_CODE-YYYY-NNNN`).
  - [ ] Tính năng Kích hoạt/Khóa tài khoản nông dân (`is_active = false`).
  - [ ] Ràng buộc: Không được xóa cứng nông dân nếu đã có vùng trồng hoặc nhật ký.

---

## 🌾 PHASE 2: QUẢN LÝ SẢN XUẤT NÔNG NGHIỆP & GPS MAP (HTX_MANAGER & FARMER)
*Mục tiêu: Số hóa vùng trồng bằng bản đồ vệ tinh, quản lý mùa vụ canh tác và giám sát nhật ký.*

- [ ] **Task 1: Số hóa Vùng trồng (Farm Zones)**
  - [ ] Tích hợp bản đồ vệ tinh (Leaflet / Mapbox) để vẽ ranh giới vùng trồng dạng đa giác (Polygon GeoJSON).
  - [ ] Tự động tính toán diện tích ($m^2$) từ Polygon được vẽ.
  - [ ] Gắn vùng trồng cho hộ nông dân cụ thể quản lý.
  - [ ] Gọi API kiểm tra chồng chéo diện tích (Overlap check qua PostGIS ST_Intersects).
- [ ] **Task 2: Thiết lập Vụ mùa (Seasons)**
  - [ ] Thiết lập vụ mùa mới (tên vụ, giống cây, ngày bắt đầu, ngày kết thúc dự kiến).
  - [ ] Ràng buộc: Một vùng trồng chỉ có đúng 1 vụ mùa hoạt động (`ACTIVE`) tại một thời điểm.
- [ ] **Task 3: Giám sát & Ghi hộ Nhật ký canh tác**
  - [ ] HTX Manager xem và phê duyệt danh sách nhật ký canh tác (Farming Logs) do nông dân gửi lên.
  - [ ] Form ghi nhật ký canh tác hộ dành cho nông dân lớn tuổi không dùng điện thoại thông minh.

---

## 📦 PHASE 3: QUẢN LÝ KHO & LOGISTICS (WAREHOUSE_KEEPER)
*Mục tiêu: Quản lý dòng vật tư nông nghiệp (hạt giống, phân bón, thuốc bảo vệ thực vật) phát cho nông dân.*

- [ ] **Task 1: Phiếu Nhập kho (Import)**
  - [ ] Giao diện lập phiếu nhập kho vật tư từ nhà cung cấp.
  - [ ] Bắt buộc nhập Số hóa đơn (`invoice_no`), ngày nhập, hạn sử dụng (`expiry_date`) và loại vật tư.
- [ ] **Task 2: Phiếu Xuất kho (Export)**
  - [ ] Giao diện lập phiếu xuất kho phân phát cho nông dân.
  - [ ] Bắt buộc chọn nông dân nhận, lý do/mục đích sử dụng.
  - [ ] Ràng buộc kiểm tra: Chặn xuất âm kho hoặc vật tư đã quá hạn sử dụng.
- [ ] **Task 3: Hệ thống Cảnh báo kho**
  - [ ] Widget hiển thị cảnh báo trên Web Admin khi vật tư sắp hết hạn (còn $\le 30$ ngày) hoặc lượng tồn kho xuống dưới mức tối thiểu.

---

## 🏷️ PHASE 4: LÔ HÀNG, QR CHECKVN & SỐ HÓA OCR (HTX_MANAGER)
*Mục tiêu: Tạo lô hàng, cấp phát tem QR truy xuất nguồn gốc CheckVN và số hóa tài liệu giấy.*

- [ ] **Task 1: Quản lý Lô hàng (Batches)**
  - [ ] Tạo lô hàng từ vụ mùa đã thu hoạch (`COMPLETED`).
  - [ ] Ràng buộc: Khối lượng lô hàng không vượt quá sản lượng thu hoạch thực tế.
- [ ] **Task 2: Yêu cầu cấp và Kích hoạt QR CheckVN**
  - [ ] Gửi yêu cầu cấp dải mã QR sang hệ thống CheckVN API.
  - [ ] Tiếp nhận dải QR (async qua webhook) và lưu trữ ở trạng thái `INACTIVE`.
  - [ ] Giao diện xuất danh sách mã QR để in tem.
  - [ ] Chức năng kích hoạt tem (Activate) hàng loạt sau khi dán lên bao bì vật lý.
- [ ] **Task 3: Số hóa sổ nhật ký giấy/hóa đơn bằng OCR**
  - [ ] Upload ảnh chụp sổ canh tác hoặc hóa đơn mua bán (tối đa 10MB/file, định dạng JPG/PNG/PDF).
  - [ ] Giao diện Polling trạng thái xử lý OCR (chạy ngầm qua BullMQ).
  - [ ] Màn hình đối chiếu: Hiển thị kết quả OCR dạng thô (Raw) song song với Form chỉnh sửa để người dùng kiểm tra trước khi xác nhận lưu vào hệ thống.

---

## 📊 PHASE 5: THẨM ĐỊNH CARBON & GIÁM SÁT VĨ MÔ (SUPER_ADMIN & GOV_VIEWER)
*Mục tiêu: Đánh giá lượng phát thải Carbon, cấp chứng chỉ và thống kê báo cáo.*

- [ ] **Task 1: Thẩm định & Phát hành tín chỉ Carbon (SUPER_ADMIN)**
  - [ ] Xem danh sách kết quả tính toán carbon của các vụ mùa hoàn thành (CarbonRecord ở trạng thái `DRAFT`).
  - [ ] Nút bấm Thẩm định (`VERIFIED`) và Cấp tín chỉ Carbon (`ISSUED`) kèm theo mã số chứng nhận quốc tế độc bản.
- [ ] **Task 2: Dashboard Giám sát vĩ mô (GOV_VIEWER)**
  - [ ] Xem báo cáo tổng hợp (dạng biểu đồ xu hướng phát thải Carbon, tổng diện tích, tổng sản lượng) theo địa bàn (tỉnh, huyện, xã).
  - [ ] Ràng buộc phân quyền: Ẩn thông tin cá nhân của từng hộ nông dân (chỉ xem dữ liệu aggregate).
  - [ ] Export báo cáo động (chạy ngầm, xuất liên kết tải về dạng Excel/PDF).
