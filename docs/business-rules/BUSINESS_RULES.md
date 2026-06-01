# Business Rules — AgriTrace Carbon

> Đây là file ràng buộc nghiệp vụ cốt lõi. AI Agent phải đọc file này trước khi implement bất kỳ service nào.

---

## BR-001: Quản lý Hộ Nông dân

| Rule ID | Ràng buộc |
|---|---|
| BR-001-1 | Mỗi nông dân phải thuộc về đúng 1 HTX (`cooperative_id`). Không tồn tại nông dân không có HTX. |
| BR-001-2 | Mã nông dân (`farmer_code`) duy nhất toàn hệ thống, format: `HTX_CODE-YYYY-NNNN` (vd: `BMT01-2024-0001`) |
| BR-001-3 | Số điện thoại là định danh đăng nhập chính, phải duy nhất trong hệ thống |
| BR-001-4 | Không được xóa (hard delete) hồ sơ nông dân nếu đã có vùng trồng hoặc nhật ký. Chỉ cho phép `is_active = false` |
| BR-001-5 | HTX Manager chỉ xem/quản lý được nông dân thuộc HTX mình. `SUPER_ADMIN` xem tất cả |

---

## BR-002: Vùng Trồng (Farm Zone)

| Rule ID | Ràng buộc |
|---|---|
| BR-002-1 | 1 nông dân có thể có nhiều vùng trồng. Mỗi vùng trồng thuộc đúng 1 nông dân |
| BR-002-2 | Vùng trồng phải có tọa độ GPS hợp lệ (polygon GeoJSON, tối thiểu 3 điểm). Diện tích tự tính từ polygon |
| BR-002-3 | Diện tích tối thiểu 100m², tối đa 500ha. Ngoài khoảng này bị reject |
| BR-002-4 | Hai vùng trồng không được overlap nhau (kiểm tra bằng PostGIS `ST_Intersects`) |
| BR-002-5 | `farm_zone_code` duy nhất, format: `FARMER_CODE-ZNN` (vd: `BMT01-2024-0001-Z01`) |
| BR-002-6 | Không được xóa vùng trồng nếu đang có vụ mùa (`season`) active hoặc đã có lô hàng. Chỉ deactivate |
| BR-002-7 | Mỗi vùng trồng phải khai báo loại cây trồng chính (`crop_type`) từ danh mục hệ thống |

---

## BR-003: Vụ Mùa & Nhật Ký Canh Tác

| Rule ID | Ràng buộc |
|---|---|
| BR-003-1 | Trước khi ghi nhật ký canh tác, vùng trồng phải có vụ mùa (`season`) đang ACTIVE |
| BR-003-2 | 1 vùng trồng chỉ được có đúng 1 vụ mùa ACTIVE tại một thời điểm |
| BR-003-3 | Ngày ghi nhật ký phải nằm trong khoảng `season.start_date` → `season.end_date` |
| BR-003-4 | Hoạt động canh tác thuộc 6 loại (enum): `SEEDING`, `FERTILIZING`, `PESTICIDE`, `IRRIGATION`, `HARVESTING`, `OTHER` |
| BR-003-5 | Hoạt động `PESTICIDE` bắt buộc ghi tên thuốc (`product_name`), liều lượng (`dosage`), đơn vị (`unit`) |
| BR-003-6 | Hoạt động `FERTILIZING` bắt buộc ghi loại phân (`fertilizer_type`), khối lượng (`quantity_kg`) |
| BR-003-7 | Hoạt động `HARVESTING` bắt buộc ghi sản lượng (`yield_kg`), ngày thu hoạch. Và chỉ 1 bản ghi HARVESTING/vụ |
| BR-003-8 | Sau khi ghi `HARVESTING`, vụ mùa chuyển sang trạng thái `COMPLETED` tự động |
| BR-003-9 | Không sửa/xóa nhật ký sau khi vụ mùa đã `COMPLETED` và lô hàng đã được gắn QR kích hoạt |
| BR-003-10 | Nông dân chỉ xem/sửa nhật ký của vùng trồng thuộc mình |

---

## BR-004: Lô Hàng & CheckVN QR

| Rule ID | Ràng buộc |
|---|---|
| BR-004-1 | Lô hàng chỉ được tạo khi vụ mùa tương ứng đã `COMPLETED` (đã thu hoạch) |
| BR-004-2 | `batch_code` duy nhất, format: `ZONE_CODE-YYYYMMDD-NNN` (vd: `BMT01-2024-0001-Z01-20241115-001`) |
| BR-004-3 | Số lượng QR yêu cầu (`quantity_requested`) phải > 0 và ≤ 10,000/lần yêu cầu |
| BR-004-4 | Tổng khối lượng lô hàng (`total_weight_kg`) không được vượt quá `yield_kg` của vụ thu hoạch |
| BR-004-5 | Trạng thái lô hàng (state machine): `DRAFT` → `PENDING_QR` → `QR_RECEIVED` → `ACTIVATING` → `ACTIVE` → `RECALLED` |
| BR-004-6 | Chỉ `HTX_MANAGER` mới được gửi yêu cầu cấp QR lên CheckVN |
| BR-004-7 | Sau khi nhận QR từ CheckVN, mã QR được lưu với trạng thái `INACTIVE`. Không thể kích hoạt trước khi HTX xét duyệt |
| BR-004-8 | Kích hoạt QR (`ACTIVATE`) chỉ được thực hiện sau khi dán tem lên bao bì vật lý. Bắt buộc ghi `activation_note` |
| BR-004-9 | QR đã ACTIVE không thể deactivate trừ khi có lệnh `RECALL` kèm lý do từ `HTX_MANAGER` hoặc `SUPER_ADMIN` |
| BR-004-10 | Mỗi mã QR chỉ gắn được với đúng 1 lô hàng. Không tái sử dụng QR |

---

## BR-005: Kho & Logistics

| Rule ID | Ràng buộc |
|---|---|
| BR-005-1 | Tồn kho không được âm. Mọi phiếu xuất kho phải kiểm tra `current_stock >= quantity_out` trước khi cho phép |
| BR-005-2 | Vật tư trong kho có 5 loại (`material_type`): `SEED`, `FERTILIZER`, `PESTICIDE`, `EQUIPMENT`, `OTHER` |
| BR-005-3 | Phiếu nhập kho (`IMPORT`) bắt buộc có nhà cung cấp (`supplier`), ngày nhập, số hóa đơn (`invoice_no`) |
| BR-005-4 | Phiếu xuất kho (`EXPORT`) bắt buộc ghi người nhận (`recipient_farmer_id`) và mục đích (`purpose`) |
| BR-005-5 | Không được sửa phiếu nhập/xuất sau khi đã được duyệt. Chỉ được tạo phiếu đối nghịch (phiếu hoàn) |
| BR-005-6 | Vật tư có hạn sử dụng (`expiry_date`). Cảnh báo khi còn ≤ 30 ngày, không cho xuất kho sau hết hạn |

---

## BR-006: Tính Toán Carbon

| Rule ID | Ràng buộc |
|---|---|
| BR-006-1 | Tính toán Carbon chỉ khả dụng khi vụ mùa đã `COMPLETED` và có đủ nhật ký `FERTILIZING` + `PESTICIDE` |
| BR-006-2 | Hệ số phát thải (emission factor) lấy từ bảng `carbon_emission_factors` do SUPER_ADMIN cấu hình, không hardcode |
| BR-006-3 | Công thức phát thải N₂O từ phân đạm: `N2O_emission = nitrogen_kg × 0.01 × 44/28 × GWP_N2O` (GWP = 273) |
| BR-006-4 | Công thức hấp thụ Carbon cây lúa: `CO2_sequestered = yield_kg × 0.45 × carbon_fraction` |
| BR-006-5 | `net_carbon = sequestered - emitted`. Kết quả âm = phát thải ròng, dương = hấp thụ ròng |
| BR-006-6 | Kết quả tính Carbon có trạng thái: `DRAFT` → `VERIFIED` → `ISSUED` (tín chỉ). Chỉ `SUPER_ADMIN` được `VERIFIED` |
| BR-006-7 | Một vụ mùa chỉ được cấp tín chỉ Carbon 1 lần (unique constraint trên `season_id`) |
| BR-006-8 | Tín chỉ Carbon sau khi `ISSUED` là bất biến. Không sửa, không xóa |

---

## BR-007: OCR & Số Hóa

| Rule ID | Ràng buộc |
|---|---|
| BR-007-1 | File upload OCR tối đa 10MB/file. Định dạng chấp nhận: JPG, PNG, PDF |
| BR-007-2 | Kết quả OCR là `RAW` — bắt buộc qua bước `REVIEW` của người dùng trước khi `CONFIRMED` vào hệ thống |
| BR-007-3 | Dữ liệu OCR đã `CONFIRMED` tạo bản ghi nhật ký/kho tương ứng, không ghi đè thủ công sau khi confirm |
| BR-007-4 | OCR job chạy async qua BullMQ — không block HTTP response. Client polling `/ocr/jobs/:jobId/status` |

---

## BR-008: Báo Cáo

| Rule ID | Ràng buộc |
|---|---|
| BR-008-1 | `GOV_VIEWER` chỉ xem báo cáo aggregate (tổng hợp theo địa bàn). Không xem dữ liệu cá nhân hộ dân |
| BR-008-2 | Báo cáo Carbon cho cơ quan nhà nước chỉ hiển thị số liệu đã `VERIFIED` |
| BR-008-3 | Dữ liệu báo cáo cache Redis 15 phút. Invalidate khi có dữ liệu mới |
| BR-008-4 | Export báo cáo (Excel/PDF) chạy async qua BullMQ, trả về download URL sau khi hoàn thành |

---

## Workflow 1: Đăng ký & Onboarding Nông dân

```
HTX_MANAGER tạo hồ sơ nông dân
    │
    ▼
Hệ thống tự sinh farmer_code
    │
    ▼
Gửi SMS OTP đến SĐT nông dân
    │
    ▼
Nông dân xác nhận OTP → tài khoản kích hoạt
    │
    ▼
HTX_MANAGER tạo vùng trồng (farm zone) cho nông dân
    │  [Vẽ polygon GPS, chọn crop_type]
    ▼
Mở vụ mùa (season) cho vùng trồng
    │
    ▼
Nông dân bắt đầu ghi nhật ký canh tác
```

---

## Workflow 2: Truy xuất nguồn gốc QR CheckVN

```
Vụ mùa COMPLETED (có HARVESTING log)
    │
    ▼
HTX_MANAGER tạo Lô hàng (batch) từ vụ mùa
    │  [batch_code, total_weight, quantity_qr_requested]
    ▼
Hệ thống gọi API CheckVN: POST /batches/request-qr
    │  [gửi batch_info, quantity, callback_url]
    ▼
CheckVN trả về dải mã QR (async webhook)
    │
    ▼
Hệ thống lưu QR với status = INACTIVE
    │
    ▼
HTX_MANAGER xuất danh sách QR → in tem vật lý
    │
    ▼
Dán tem lên bao bì → WAREHOUSE_KEEPER quét QR
    │  [gắn QR vào đúng lô hàng]
    ▼
HTX_MANAGER kích hoạt batch → tất cả QR → ACTIVE
    │
    ▼
Người tiêu dùng quét QR → GET /public/trace/:qrCode
    │
    ▼
Hiển thị: vùng trồng + nhật ký + ảnh + Carbon badge
```

---

## Workflow 3: Tính toán & Cấp tín chỉ Carbon

```
Vụ mùa COMPLETED
    │
    ▼
Carbon worker trigger tự động (BullMQ job)
    │
    ▼
Collect dữ liệu: tất cả FERTILIZING + PESTICIDE logs
    │
    ▼
Áp dụng emission factors từ DB
    │
    ▼
Tính net_carbon (theo BR-006)
    │
    ▼
Lưu CarbonRecord với status = DRAFT
    │
    ▼
SUPER_ADMIN review → VERIFIED
    │
    ▼
Phát hành tín chỉ → status = ISSUED
    │  [carbon_credit_amount, issued_at, certificate_no]
    ▼
Hiển thị huy hiệu Carbon trên trang tra cứu QR
```

---

## Error Codes chuẩn

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `UNAUTHORIZED` | 401 | Chưa đăng nhập hoặc token hết hạn |
| `FORBIDDEN` | 403 | Không có quyền truy cập resource này |
| `FARMER_NOT_FOUND` | 404 | Không tìm thấy hộ dân |
| `ZONE_NOT_FOUND` | 404 | Không tìm thấy vùng trồng |
| `ZONE_OVERLAP` | 409 | Vùng trồng bị trùng với vùng đã có |
| `SEASON_ALREADY_ACTIVE` | 409 | Vùng trồng đã có vụ mùa đang mở |
| `SEASON_NOT_ACTIVE` | 422 | Không thể ghi nhật ký — vụ mùa chưa mở hoặc đã đóng |
| `INSUFFICIENT_STOCK` | 422 | Tồn kho không đủ để xuất |
| `BATCH_INVALID_WEIGHT` | 422 | Khối lượng lô hàng vượt sản lượng thu hoạch |
| `QR_ALREADY_ACTIVE` | 409 | QR đã được kích hoạt, không thể thay đổi |
| `CHECKVN_API_ERROR` | 502 | Lỗi khi gọi API CheckVN |
| `CARBON_ALREADY_ISSUED` | 409 | Vụ mùa đã được cấp tín chỉ Carbon rồi |
| `OCR_JOB_PENDING` | 202 | OCR đang xử lý, dùng polling |
| `VALIDATION_ERROR` | 400 | Dữ liệu đầu vào không hợp lệ (kèm field details) |
