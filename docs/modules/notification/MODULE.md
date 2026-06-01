# Module: notification

## Mục đích
Gửi thông báo đẩy (in-app), SMS, email cho các sự kiện quan trọng trong hệ thống.

## Endpoints

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/notifications` | Authenticated | Danh sách thông báo của user |
| PUT | `/api/v1/notifications/:id/read` | Authenticated | Đánh dấu đã đọc |
| PUT | `/api/v1/notifications/read-all` | Authenticated | Đánh dấu tất cả đã đọc |
| GET | `/api/v1/notifications/unread-count` | Authenticated | Số thông báo chưa đọc |

## Notification Events (trigger từ các module khác)

| Event | Trigger khi | Gửi đến | Kênh |
|---|---|---|---|
| `FARMER_CREATED` | Tạo hộ nông dân mới | Nông dân | SMS (OTP kích hoạt) |
| `SEASON_OPENED` | Mở vụ mùa mới | Nông dân sở hữu zone | In-app |
| `QR_RECEIVED` | CheckVN trả QR về | HTX_MANAGER | In-app |
| `BATCH_ACTIVATED` | Lô hàng kích hoạt | HTX_MANAGER | In-app |
| `BATCH_RECALLED` | Lô hàng bị thu hồi | HTX_MANAGER, SUPER_ADMIN | In-app + SMS |
| `CARBON_COMPUTED` | Worker tính xong Carbon | HTX_MANAGER | In-app |
| `CARBON_VERIFIED` | SUPER_ADMIN verify | HTX_MANAGER | In-app |
| `CARBON_ISSUED` | Tín chỉ được phát hành | HTX_MANAGER | In-app |
| `LOW_STOCK_ALERT` | Tồn kho dưới ngưỡng | WAREHOUSE_KEEPER, HTX_MANAGER | In-app |
| `MATERIAL_EXPIRING` | Vật tư còn ≤ 30 ngày | WAREHOUSE_KEEPER | In-app |
| `OCR_COMPLETED` | Worker xử lý OCR xong | Người upload | In-app |
| `CHECKVN_ERROR` | Gọi CheckVN thất bại | SUPER_ADMIN | In-app |

## Business Logic

### Gửi thông báo (từ module khác gọi)
```typescript
// Các module khác inject NotificationService và gọi:
await notificationService.send({
  event: 'QR_RECEIVED',
  recipient_user_ids: [htxManagerUserId],
  title: 'Mã QR đã sẵn sàng',
  body: `Lô hàng ${batchCode} đã nhận được ${qrCount} mã QR từ CheckVN`,
  metadata: { batch_id: '...' },
  channels: ['in_app'],  // hoặc ['in_app', 'sms']
});
```

### SMS
- Dùng ESMS.vn hoặc Twilio
- Chỉ gửi SMS cho sự kiện quan trọng: OTP, RECALL, lỗi nghiêm trọng
- Rate limit: tối đa 3 SMS/SĐT/giờ

### In-app
- Lưu vào bảng `Notification` PostgreSQL
- Deliver qua WebSocket hoặc polling (client poll `/notifications/unread-count` mỗi 30s)

## Prisma Schema

```prisma
model Notification {
  id          String    @id @default(cuid())
  user_id     String
  event       String
  title       String
  body        String
  metadata    Json?
  is_read     Boolean   @default(false)
  read_at     DateTime?
  created_at  DateTime  @default(now())

  @@index([user_id, is_read])
  @@index([user_id, created_at])
}
```

## Notes
- Module này không có business logic phức tạp — chỉ là delivery layer
- Tất cả thông báo đẩy chạy qua BullMQ queue `notifications` (fire-and-forget, retry 2 lần)
- SMS template lưu trong code constants, không lưu DB (thay đổi ít)
