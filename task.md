# Kế hoạch triển khai - Vai trò HTX Manager

Dưới đây là kế hoạch triển khai chi tiết dựa trên sơ đồ quy trình vận hành của **HTX Manager**. Hệ thống được chia làm 5 Phase theo đúng thứ tự thời gian của luồng nghiệp vụ chính, kèm theo các ràng buộc phân quyền nghiêm ngặt.

---

## 🔒 RÀNG BUỘC PHÂN QUYỀN (RBAC CONSTRAINTS)
*Áp dụng trong tất cả các API và giao diện của HTX Manager:*
- [ ] **Ràng buộc 1**: Chỉ xem và thao tác dữ liệu trong phạm vi HTX của mình (bắt buộc filter theo `cooperative_id` từ token JWT).
- [ ] **Ràng buộc 2**: Chặn truy cập dữ liệu của HTX khác (trả về lỗi `403 Forbidden` nếu vi phạm).
- [ ] **Ràng buộc 3**: Không có quyền của `SUPER_ADMIN` (không được tạo/sửa HTX khác, không được Thẩm định/Phát hành tín chỉ Carbon `VERIFIED` / `ISSUED`).

---

## 📅 CÁC PHA TRIỂN KHAI CHI TIẾT (PHASES)

### 🌿 PHASE 1: ONBOARDING - NÔNG DÂN & VÙNG TRỒNG (BƯỚC 1 LUỒNG NGHIỆP VỤ)
*Mục tiêu: Thiết lập hồ sơ nông dân và số hóa ranh giới vùng trồng.*

#### 1. Quản lý hồ sơ Nông dân
- [x] Tạo mới hồ sơ nông dân: `POST /farmers` (Tự động sinh mã `farmer_code` định dạng `HTX_CODE-YYYY-NNNN`).
- [x] Sửa đổi hồ sơ nông dân: `PUT /farmers/:id`.
- [x] Xem danh sách nông dân thuộc HTX: `GET /farmers` (bắt buộc kiểm tra `cooperative_id`).
- [x] Vô hiệu hóa tài khoản nông dân: Cập nhật `is_active = false` (không xóa cứng khỏi database nếu đã có dữ liệu liên quan).

#### 2. Thiết lập Vùng trồng (Farm Zones)
- [x] Tích hợp bản đồ GPS vẽ ranh giới vùng trồng dạng Polygon (GeoJSON).
- [x] Tính năng tự động tính toán diện tích ($m^2$) từ Polygon.
- [x] Gọi API kiểm tra chồng chéo diện tích (Overlap check) qua PostGIS trước khi lưu.

---

### 🌾 PHASE 2: THIẾT LẬP VỤ MÙA & NHẬT KÝ CANHTÁC (BƯỚC 2 LUỒNG NGHIỆP VỤ)
*Mục tiêu: Khai báo vụ canh tác và theo dõi hoạt động sản xuất.*

#### 1. Quản lý Vụ mùa
- [x] Mở vụ mùa mới: `POST /seasons` (Khai báo giống cây, sản lượng dự kiến, ngày bắt đầu/kết thúc).
- [x] Ràng buộc: Mỗi vùng trồng chỉ được có tối đa 1 vụ mùa ở trạng thái hoạt động (`ACTIVE`) tại một thời điểm.
- [x] Đóng vụ mùa sau khi thu hoạch (`COMPLETED`) và ghi nhận sản lượng thực tế.

#### 2. Nhật ký Canh tác (Farming Logs)
- [x] Theo dõi và phê duyệt nhật ký canh tác do nông dân gửi lên (bón phân, phun thuốc, tưới nước).
- [x] Giao diện cho phép HTX Manager ghi nhật ký hộ cho các nông dân không sử dụng smartphone.

---

### 📦 PHASE 3: KHO VẬT TƯ & LOGISTICS (BƯỚC 3 LUỒNG NGHIỆP VỤ)
*Mục tiêu: Quản lý vật tư đầu vào phân phát cho nông dân.*

#### 1. Quản lý Nhập kho (Import)
- [ ] Tạo phiếu nhập kho vật tư (phân bón, thuốc bảo vệ thực vật, hạt giống).
- [ ] Bắt buộc nhập: hóa đơn (`invoice_no`), hạn sử dụng, nhà cung cấp.

#### 2. Cấp phát Vật tư
- [ ] Lập phiếu cấp phát vật tư từ kho HTX trực tiếp cho hộ nông dân.
- [ ] Ràng buộc: Kiểm tra tồn kho trước khi xuất (chặn xuất âm) và chặn xuất vật tư đã quá hạn sử dụng.

#### 3. Giám sát kho & Sản lượng
- [ ] Giao diện xem tồn kho thời gian thực kèm cảnh báo hết hàng hoặc sắp hết hạn sử dụng.
- [ ] Đối chiếu lượng vật tư cấp phát với nhật ký canh tác thực tế để đảm bảo tính minh bạch.

---

### 🏷️ PHASE 4: LÔ HÀNG & QR CODE CHECKVN (BƯỚC 4 LUỒNG NGHIỆP VỤ)
*Mục tiêu: Đóng gói sản phẩm, kết nối CheckVN để in và kích hoạt mã QR truy xuất.*

#### 1. Quản lý Lô hàng (Batches)
- [ ] Tạo lô hàng mới từ các vụ mùa đã hoàn thành thu hoạch (`COMPLETED`).
- [ ] Ràng buộc: Khối lượng lô hàng không vượt quá sản lượng thu hoạch thực tế của vụ mùa.

#### 2. Tích hợp CheckVN API & Tem QR
- [ ] Gửi yêu cầu cấp dải mã QR sang hệ thống CheckVN.
- [ ] Tiếp nhận dải mã QR và lưu trữ ở trạng thái chưa kích hoạt (`INACTIVE`).
- [ ] Hỗ trợ xuất danh sách tem để in và dán lên bao bì sản phẩm.
- [ ] Kích hoạt dải QR hàng loạt chuyển trạng thái lô hàng (`batch -> ACTIVE`).

---

### 📊 PHASE 5: BÁO CÁO CARBON & DASHBOARD TỔNG QUAN (BƯỚC 5 LUỒNG NGHIỆP VỤ)
*Mục tiêu: Tổng hợp số liệu phát thải, xuất báo cáo và chứng nhận tiêu chuẩn.*

#### 1. Dashboard Tổng quan HTX
- [ ] Thống kê nhanh: Tổng số nông dân, diện tích vùng trồng, số vụ mùa đang chạy, tổng lượng vật tư đã cấp phát.
- [ ] Biểu đồ xu hướng phát thải carbon của các vụ mùa trong năm.

#### 2. Báo cáo phát thải Carbon & Tín chỉ
- [ ] Xem kết quả tính toán carbon (CarbonRecord) dựa trên lượng phân bón, thuốc sử dụng ghi trong nhật ký.
- [ ] Xuất báo cáo động định dạng Excel / PDF theo biểu mẫu tiêu chuẩn.
- [ ] Tích hợp kiểm tra và đánh giá tuân thủ các tiêu chuẩn canh tác (VietGAP, OCOP).
