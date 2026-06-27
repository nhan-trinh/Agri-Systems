# Thiết kế Redesign Dashboard - AgriTrace Carbon

**Ngày**: 27/06/2026  
**Tác giả**: Antigravity  
**Trạng thái**: Đã phê duyệt (Approved)

---

## 1. Mục tiêu & Định hướng
Cải thiện trải nghiệm UI/UX của màn hình Dashboard tổng quan. Hiện tại layout đã hợp lý nhưng việc lạm dụng các đường viền (excessive borders) khiến giao diện trông nặng nề và mang tính "mẫu mặc định". 
Mục tiêu là tinh giản tối đa các đường viền, áp dụng phong cách thiết kế hiện đại, hữu cơ (Organic Modernism) với các thẻ bo tròn mượt mà, chiều sâu thông qua đổ bóng mờ mịn và hệ thống màu sắc HSL hài hòa đậm chất nông nghiệp thông minh.

---

## 2. Hệ thống Token & Phong cách thiết kế

### 2.1 Bảng màu (Color Palette)
- **Nền chính (Base BG)**: `#f4f6f3` (Màu xám ánh xanh lá cây nhạt, tạo cảm giác dịu nhẹ, sạch sẽ và hữu cơ).
- **Nền thẻ (Card BG)**: `#ffffff` (Màu trắng tinh khiết, tương phản tốt trên nền xám xanh).
- **Màu thương hiệu (Forest Green)**: `#1b4332` (Màu xanh rừng sâu thẳm, biểu thị độ bền vững và chuyên nghiệp).
- **Màu nhấn 1 (Mint Leaf)**: `#52b788` (Màu xanh lá tươi mát, biểu thị sự tăng trưởng, trạng thái hoạt động tích cực).
- **Màu nhấn 2 (Gold Grain)**: `#faf0d9` (Nền) / `#b5832a` (Chữ) (Màu vàng rơm/lúa chín, đại diện cho mùa màng bội thu và sản lượng nông nghiệp).
- **Màu chữ chính (Slate Earth)**: `#2d312e` (Màu than ấm, tăng độ tương phản và dễ đọc, thay thế cho màu đen tuyền `#000000` quá gắt).

### 2.2 Typography
- **Tiêu đề chính & Chỉ số Hero**: `Fraunces` (Font Serif sang trọng, đường nét mềm mại tự nhiên).
- **Văn bản & Giao diện phụ**: `Plus Jakarta Sans` (Font Sans-serif hiện đại, gọn gàng, hiển thị thông tin rõ ràng và chuyên nghiệp).

---

## 3. Cấu trúc Layout chi tiết

- **Loại bỏ hoàn toàn viền cứng (`border`, `border-r`, `border-b`)** trên các khung bao ngoài, sidebar, header và các thẻ chứa thông tin.
- **Phân tách không gian bằng bóng mờ mềm mịn** (`shadow-[0_1px_3px_rgba(0,0,0,0.02),0_12px_40px_rgba(27,67,50,0.03)]`) kết hợp với màu nền chính `#f4f6f3`.
- **Sidebar**: Chuyển sang nền trắng mờ mịn, loại bỏ đường viền phân cách bên phải, sử dụng góc bo tròn lớn (`rounded-2xl`) cho các nút điều hướng đang active và đổ bóng nhẹ.
- **Header**: Bỏ đường viền dưới, sử dụng hiệu ứng kính mờ (`bg-white/75 backdrop-blur-md`) giúp header nổi nhẹ trên nền nội dung khi cuộn.
- **Hero Stats**:
  * Thẻ Carbon Credits: Gradient sâu từ `#1b4332` đến `#2d5a45` kết hợp với họa tiết vòng tròn đồng tâm mờ ẩn dưới nền.
  * Thẻ Yield: Màu vàng lúa chín ấm áp (#faf0d9) kết hợp biểu tượng Wheat màu vàng sậm.
- **Operational Cards**: Định dạng thẻ bo tròn cực lớn (`rounded-3xl`), không viền, đổ bóng tinh tế, hiệu ứng hover nhấc nhẹ (`hover:-translate-y-0.5`).
- **Charts (Recharts)**: Tùy biến đường lưới xám rất nhạt (`#e6ebe3`), cột biểu đồ bo tròn góc đầu, vùng sản lượng sử dụng gradient xanh lá mượt mà.
- **Quick Actions & Recent Activities**: Trình bày dưới dạng các khối nội dung sạch, bo tròn góc, các nút thao tác sử dụng hiệu ứng hover đổi màu nền chuyển tiếp mượt mà.
