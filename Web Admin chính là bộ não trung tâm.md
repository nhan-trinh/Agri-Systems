Web Admin chính là bộ não trung tâm điều hành toàn bộ hệ thống AgriTrace Carbon. Đây là cổng thông tin dành cho 4 nhóm đối tượng quản trị và vận hành (bao gồm Super Admin, HTX Manager, Thủ kho, và Cán bộ Nhà nước), trong khi ứng dụng Zalo Mini App chỉ dành riêng cho Hộ nông dân.

Dưới đây là chi tiết nhiệm vụ và các chức năng cụ thể trên Web Admin phân chia theo từng vai trò:

1. HTX_MANAGER (Quản lý Hợp tác xã) — Người sử dụng chính
HTX Manager là người điều phối và kiểm soát mọi hoạt động sản xuất của các hộ dân thành viên:

Quản lý Hộ nông dân:
Tạo hồ sơ nông dân mới (hệ thống tự sinh mã farmer_code theo format HTX_CODE-YYYY-NNNN).
Kích hoạt/khóa tài khoản nông dân khi cần thiết.
Quản lý Vùng trồng (Farm Zones):
Tạo mới vùng trồng, định vị vùng bao trên bản đồ vệ tinh bằng tọa độ GPS Polygon (GeoJSON) để hệ thống tự động tính diện tích (m²).
Gắn vùng trồng đó cho hộ nông dân quản lý.
Quản lý Vụ mùa (Seasons):
Thiết lập và mở vụ mùa mới (ví dụ: Vụ mùa Đông - Xuân 2024) cho từng vùng trồng để nông dân bắt đầu ghi nhật ký.
Quản lý Lô hàng & Kích hoạt Tem QR CheckVN:
Khi nông dân thu hoạch xong (vụ mùa kết thúc), HTX Manager sẽ tạo Lô hàng (Batch) trên web.
Gửi yêu cầu cấp dải mã QR sang hệ thống cổng quốc gia CheckVN.
Sau khi in tem và dán lên bao bì sản phẩm, nhấn Kích hoạt (Activate) trên web để người tiêu dùng có thể quét QR tra cứu.
Giám sát & Hỗ trợ:
Xem và duyệt các Nhật ký canh tác (Farming Logs) do nông dân gửi lên.
Ghi nhật ký canh tác hộ cho những nông dân lớn tuổi không dùng smartphone.
2. WAREHOUSE_KEEPER (Thủ kho HTX) — Quản lý Logistics
Thủ kho chịu trách nhiệm quản lý dòng vật tư nông nghiệp (hạt giống, phân bón, thuốc bảo vệ thực vật) phân phát cho nông dân:

Quản lý Nhập kho (Import): Lập phiếu nhập kho vật tư từ nhà cung cấp (bắt buộc nhập Số hóa đơn invoice_no và Hạn sử dụng expiry_date).
Quản lý Xuất kho (Export): Lập phiếu xuất kho phân phát vật tư cho nông dân (bắt buộc chọn tên nông dân nhận và lý do/mục đích). Hệ thống sẽ tự động chặn nếu xuất âm kho hoặc vật tư đã quá hạn sử dụng.
Theo dõi & Cảnh báo: Hệ thống hiển thị cảnh báo trên web khi vật tư sắp hết hạn (dưới 30 ngày) hoặc lượng tồn kho xuống dưới mức tối thiểu.
3. SUPER_ADMIN (Quản trị viên tối cao) — Cấu hình & Duyệt Carbon
Super Admin là admin hệ thống, có quyền hạn cao nhất:

Quản lý danh mục HTX: Tạo mới và cấu hình các Hợp tác xã tham gia hệ thống.
Cấu hình hệ số phát thải Carbon (Emission Factor): Nhập các chỉ số phát thải của phân đạm, thuốc trừ sâu vào cơ sở dữ liệu (không hardcode) phục vụ công thức toán học tính Carbon tự động.
Thẩm định & Phát hành tín chỉ Carbon: Review kết quả phát thải ròng của từng vụ mùa (CarbonRecord ở dạng DRAFT), tiến hành Duyệt (Verified) và Cấp tín chỉ Carbon (Issued) với mã chứng nhận quốc tế độc bản.
4. GOV_VIEWER (Cán bộ nhà nước / Cơ quan kiểm toán) — Giám sát vĩ mô
Cán bộ kiểm toán hoặc cơ quan quản lý nông nghiệp nhà nước được cấp tài khoản chỉ có quyền xem (Read-only):

Xem báo cáo tổng hợp (Aggregate Reports): Xem biểu đồ, số liệu thống kê tổng lượng Carbon giảm phát thải, tổng diện tích, tổng sản lượng của toàn địa bàn (tỉnh, huyện, xã) mà không được xem chi tiết thông tin cá nhân của từng hộ dân (đảm bảo quyền riêng tư).
Kiểm tra tính minh bạch: Truy xuất lịch sử canh tác đã qua thẩm định để phục vụ công tác thanh tra/cấp chứng chỉ xuất khẩu.