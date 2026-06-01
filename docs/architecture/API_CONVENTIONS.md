# API Conventions — AgriTrace Carbon

## Base URL
```
/api/v1/<resource>
```

## Response Format

```typescript
// Thành công — đơn lẻ
{ "success": true, "data": { ... } }

// Thành công — danh sách có phân trang
{
  "success": true,
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 150, "total_pages": 8 }
}

// Lỗi
{
  "success": false,
  "error": {
    "code": "FARMER_NOT_FOUND",
    "message": "Không tìm thấy hộ dân với ID này",
    "details": []
  }
}

// Lỗi validation (400)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [
      { "field": "phone", "message": "Số điện thoại không đúng định dạng" }
    ]
  }
}
```

## HTTP Status Codes

| Code | Khi nào dùng |
|---|---|
| 200 | GET thành công, PUT thành công |
| 201 | POST tạo mới thành công |
| 202 | Accepted — job async được enqueue |
| 204 | DELETE thành công (không có body) |
| 400 | Validation error |
| 401 | Chưa đăng nhập / token hết hạn |
| 403 | Không có quyền |
| 404 | Resource không tồn tại |
| 409 | Conflict (duplicate, state machine violation) |
| 422 | Business rule violation |
| 502 | Lỗi từ external API (CheckVN) |
| 500 | Lỗi server không xác định |

## Phân trang

Query params chuẩn: `?page=1&limit=20&sort_by=created_at&sort_order=desc`
- `page` mặc định: 1
- `limit` mặc định: 20, tối đa: 100

## Đặt tên Resource

- Dùng kebab-case: `/farm-zones`, `/farming-logs`
- Plural: `/farmers` (không phải `/farmer`)
- Nested: `/farm-zones/:id/seasons` (tối đa 2 cấp)
- Action: `/batches/:id/activate` (POST — verb sau noun)

## Headers bắt buộc

```
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
```

## Soft Delete Convention

- Không bao giờ hard delete (trừ khi có chỉ định riêng)
- Field: `is_active: false` + `deleted_at: DateTime`
- GET endpoints tự động filter `is_active = true` (trừ khi có `?include_deleted=true` và role = SUPER_ADMIN)
