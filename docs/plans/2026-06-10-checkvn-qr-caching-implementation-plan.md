# CheckVN QR & Batch Management Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Triển khai module đóng gói lô hàng (Batch) và tích hợp dịch vụ CheckVN cấp mã QR (Mock bất đồng bộ) có kèm lớp bảo mật chữ ký HMAC và trang tra cứu thông tin công khai tối ưu qua cache Redis.

**Architecture:** Sử dụng kiến trúc module NestJS/Express truyền thống. Viết DTO bằng Zod, tầng repository để truy cập bảng `Batch` và `QrCode` trong Postgres/Prisma. Tầng Service đảm nhiệm logic nghiệp vụ, xử lý gọi callback bất đồng bộ qua background task (axios.post kèm chữ ký HMAC) và cơ chế cache-aside cho trang tra cứu công khai.

**Tech Stack:** Express, Prisma, Zod, Redis, Axios, Jest, HMAC-SHA256

---

### Task 1: Cấu hình Zod DTOs cho Lô hàng & Webhook

**Files:**
- Modify: `d:/Downloads/agri-system/BackEnd/src/modules/checkvn-qr/checkvn-qr.dto.ts`

**Step 1: Định nghĩa các schema Zod cần thiết**
Khai báo schemas Zod và TypeScript types cho tạo lô hàng, kích hoạt, thu hồi, và dữ liệu webhook trả về.

```typescript
import { z } from 'zod';

export const CreateBatchDto = z.object({
  season_id: z.string().min(1, 'Mã vụ mùa không được để trống'),
  batch_name: z.string().min(2, 'Tên lô hàng phải từ 2 ký tự trở lên'),
  total_weight_kg: z.number().positive('Tổng khối lượng phải là số dương'),
  quantity_qr_requested: z.number().int().min(1).max(10000, 'Số lượng QR yêu cầu từ 1 đến 10,000'),
  packaging_unit: z.string().min(1, 'Đơn vị đóng gói không được để trống'),
  product_description: z.string().optional(),
});

export const ActivateBatchDto = z.object({
  activation_note: z.string().min(5, 'Ghi chú kích hoạt phải tối thiểu 5 ký tự'),
});

export const RecallBatchDto = z.object({
  recall_reason: z.string().min(5, 'Lý do thu hồi phải tối thiểu 5 ký tự'),
});

export const WebhookQrDto = z.object({
  checkvn_batch_id: z.string().min(1, 'Mã checkvn_batch_id không được để trống'),
  qr_codes: z.array(z.string()).min(1, 'Danh sách mã QR không được để trống'),
});

export type CreateBatchInput = z.infer<typeof CreateBatchDto>;
export type ActivateBatchInput = z.infer<typeof ActivateBatchDto>;
export type RecallBatchInput = z.infer<typeof RecallBatchDto>;
export type WebhookQrInput = z.infer<typeof WebhookQrDto>;
```

**Step 2: Viết một test kiểm thử nhanh cho DTOs**
Thêm bài test vào `checkvn-qr.test.ts` để chắc chắn Zod schemas hoạt động đúng.

**Step 3: Commit**
```bash
git add src/modules/checkvn-qr/checkvn-qr.dto.ts
git commit -m "feat: define Zod schemas and DTOs for CheckvnQr module"
```

---

### Task 2: Triển khai Repository cho Batch và QrCode

**Files:**
- Modify: `d:/Downloads/agri-system/BackEnd/src/modules/checkvn-qr/checkvn-qr.repository.ts`

**Step 1: Viết các câu lệnh truy vấn Prisma**
Xây dựng lớp `CheckvnQrRepository` tương tác với Prisma Client cho các model `Batch` và `QrCode`:

```typescript
import prisma from '../../prisma/client';
import { Batch, QrCode, Prisma, BatchStatus } from '@prisma/client';

export class CheckvnQrRepository {
  async findAll(cooperativeId?: string): Promise<Batch[]> {
    return prisma.batch.findMany({
      where: cooperativeId
        ? { season: { farm_zone: { farmer: { cooperative_id: cooperativeId } } } }
        : undefined,
      include: {
        season: {
          include: {
            farm_zone: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: string): Promise<(Batch & { season: any; qr_codes?: QrCode[] }) | null> {
    return prisma.batch.findUnique({
      where: { id },
      include: {
        season: {
          include: {
            farm_zone: {
              include: {
                farmer: true,
              },
            },
          },
        },
        qr_codes: true,
      },
    });
  }

  async findByBatchCode(batchCode: string): Promise<Batch | null> {
    return prisma.batch.findUnique({
      where: { batch_code: batchCode },
    });
  }

  async findByCheckvnBatchId(checkvnBatchId: string): Promise<Batch | null> {
    return prisma.batch.findFirst({
      where: { checkvn_batch_id: checkvnBatchId },
    });
  }

  async countByZoneAndDate(farmZoneId: string, dateStr: string): Promise<number> {
    // Tìm các batch được tạo trong ngày cụ thể cho farm_zone_id đó
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
    return prisma.batch.count({
      where: {
        season: { farm_zone_id: farmZoneId },
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
  }

  async findQrByCode(code: string): Promise<(QrCode & { batch: any }) | null> {
    return prisma.qr_code.findUnique({
      where: { code },
      include: {
        batch: {
          include: {
            season: {
              include: {
                farm_zone: {
                  include: {
                    farmer: {
                      include: {
                        cooperative: true,
                      },
                    },
                  },
                },
                farming_logs: {
                  orderBy: { activity_date: 'asc' },
                },
                carbon_record: true,
              },
            },
          },
        },
      },
    });
  }

  async createBatch(data: Prisma.BatchCreateInput): Promise<Batch> {
    return prisma.batch.create({
      data,
    });
  }

  async updateBatch(id: string, data: Prisma.BatchUpdateInput): Promise<Batch> {
    return prisma.batch.update({
      where: { id },
      data,
    });
  }

  async saveQrCodesAndCompleteBatch(batchId: string, qrCodes: string[], checkvnBatchId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Lưu dải mã QR
      await tx.qr_code.createMany({
        data: qrCodes.map((code) => ({
          code,
          batch_id: batchId,
          status: 'INACTIVE',
        })),
        skipDuplicates: true,
      });

      // 2. Cập nhật trạng thái Batch
      await tx.batch.update({
        where: { id: batchId },
        data: {
          status: 'QR_RECEIVED',
          checkvn_batch_id: checkvnBatchId,
        },
      });
    });
  }

  async activateBatchAndQrCodes(batchId: string, note: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Kích hoạt lô hàng
      await tx.batch.update({
        where: { id: batchId },
        data: {
          status: 'ACTIVE',
          activated_at: new Date(),
          activation_note: note,
        },
      });

      // 2. Kích hoạt toàn bộ mã QR của lô
      await tx.qr_code.updateMany({
        where: { batch_id: batchId },
        data: {
          status: 'ACTIVE',
          activated_at: new Date(),
        },
      });
    });
  }

  async recallBatchAndQrCodes(batchId: string, reason: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Thu hồi lô hàng
      await tx.batch.update({
        where: { id: batchId },
        data: {
          status: 'RECALLED',
          recalled_at: new Date(),
          recall_reason: reason,
        },
      });

      // 2. Thu hồi toàn bộ mã QR của lô
      await tx.qr_code.updateMany({
        where: { batch_id: batchId },
        data: {
          status: 'RECALLED',
          recalled_at: new Date(),
        },
      });
    });
  }
}

export const checkvnQrRepository = new CheckvnQrRepository();
```

**Step 2: Commit**
```bash
git add src/modules/checkvn-qr/checkvn-qr.repository.ts
git commit -m "feat: implement CheckvnQrRepository with prisma transaction operations"
```

---

### Task 3: Triển khai Service Nghiệp vụ & Mock Callback Bất đồng bộ

**Files:**
- Modify: `d:/Downloads/agri-system/BackEnd/src/modules/checkvn-qr/checkvn-qr.service.ts`

**Step 1: Viết logic xử lý Caching, Webhook và Mock CheckVN**
Triển khai service chứa toàn bộ luồng nghiệp vụ tạo lô hàng, gửi bất đồng bộ, webhook bảo mật HMAC, kích hoạt/thu hồi, và tra cứu qua cache Redis.

```typescript
import { checkvnQrRepository } from './checkvn-qr.repository';
import { seasonRepository } from '../season/season.repository';
import { AppError } from '../../shared/utils/app-error';
import { Batch, QrCode } from '@prisma/client';
import { getRedisClient } from '../../shared/utils/redis.client';
import crypto from 'crypto';
import axios from 'axios';
import config from '../../config/app-config'; // Cần check import chuẩn config

export class CheckvnQrService {
  private getWebhookSecret(): string {
    return process.env.CHECKVN_WEBHOOK_SECRET || 'checkvn_webhook_secret_key_default';
  }

  async getAllBatches(user: any): Promise<Batch[]> {
    if (user.role === 'SUPER_ADMIN') {
      return checkvnQrRepository.findAll();
    }
    return checkvnQrRepository.findAll(user.cooperativeId);
  }

  async getBatchById(id: string, user: any): Promise<any> {
    const batch = await checkvnQrRepository.findById(id);
    if (!batch) {
      throw new AppError('BATCH_NOT_FOUND', 404, 'Không tìm thấy lô hàng');
    }
    if (user.role !== 'SUPER_ADMIN' && batch.season.farm_zone.farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền xem thông tin lô hàng này');
    }
    return batch;
  }

  async createBatch(data: any, user: any): Promise<Batch> {
    // 1. Kiểm tra vụ mùa tồn tại
    const season = await seasonRepository.findById(data.season_id);
    if (!season) {
      throw new AppError('SEASON_NOT_FOUND', 404, 'Không tìm thấy vụ mùa tương ứng');
    }

    // Kiểm tra quyền
    if (user.role !== 'SUPER_ADMIN' && season.farm_zone.farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không thể tạo lô hàng cho vụ canh tác thuộc hợp tác xã khác');
    }

    // 2. Ràng buộc: vụ mùa phải COMPLETED
    if (season.status !== 'COMPLETED') {
      throw new AppError('SEASON_NOT_COMPLETED', 400, 'Vụ mùa chưa hoàn thành thu hoạch, không thể tạo lô hàng');
    }

    // 3. Khối lượng lô hàng không vượt quá actual_yield_kg của vụ mùa
    const actualYield = season.actual_yield_kg || 0;
    if (data.total_weight_kg > actualYield) {
      throw new AppError('BATCH_WEIGHT_EXCEEDED', 400, `Tổng khối lượng lô hàng vượt quá sản lượng thu hoạch thực tế (${actualYield} kg)`);
    }

    // 4. Sinh mã batch_code: ZONE_CODE-YYYYMMDD-NNN
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await checkvnQrRepository.countByZoneAndDate(season.farm_zone_id, new Date().toISOString().slice(0, 10));
    const serial = String(countToday + 1).padStart(3, '0');
    const batchCode = `${season.farm_zone.farm_zone_code}-${todayStr}-${serial}`;

    return checkvnQrRepository.createBatch({
      batch_code: batchCode,
      season: { connect: { id: data.season_id } },
      batch_name: data.batch_name,
      total_weight_kg: data.total_weight_kg,
      quantity_qr_requested: data.quantity_qr_requested,
      packaging_unit: data.packaging_unit,
      product_description: data.product_description,
      created_by: user.id,
    });
  }

  async requestQrCodes(id: string, user: any): Promise<any> {
    const batch = await this.getBatchById(id, user);

    if (batch.status !== 'DRAFT') {
      throw new AppError('BATCH_NOT_DRAFT', 400, 'Chỉ có thể yêu cầu cấp QR cho lô hàng ở trạng thái DRAFT');
    }

    const checkvnBatchId = `cvn_batch_${crypto.randomUUID().substring(0, 8)}`;

    // Cập nhật PENDING_QR
    await checkvnQrRepository.updateBatch(id, {
      status: 'PENDING_QR',
      checkvn_batch_id: checkvnBatchId,
    });

    // Kích hoạt giả lập Callback CheckVN bất đồng bộ (sau 2 giây)
    this.triggerMockCallback(id, batch.batch_code, checkvnBatchId, batch.quantity_qr_requested);

    return {
      message: 'Yêu cầu cấp mã QR đã được gửi đi thành công',
      checkvn_batch_id: checkvnBatchId,
    };
  }

  private triggerMockCallback(batchId: string, batchCode: string, checkvnBatchId: string, quantity: number) {
    setTimeout(async () => {
      try {
        // Sinh dải mã QR
        const qrCodes: string[] = [];
        for (let i = 1; i <= quantity; i++) {
          const qrSerial = String(i).padStart(5, '0');
          qrCodes.push(`QR-${batchCode}-${qrSerial}`);
        }

        const payload = {
          checkvn_batch_id: checkvnBatchId,
          qr_codes: qrCodes,
        };

        const secret = this.getWebhookSecret();
        const signature = crypto
          .createHmac('sha256', secret)
          .update(JSON.stringify(payload))
          .digest('hex');

        // Gọi HTTP POST ngược lại webhook của hệ thống
        const localPort = process.env.PORT || 3000;
        await axios.post(`http://localhost:${localPort}/api/v1/qr/webhook`, payload, {
          headers: {
            'x-checkvn-signature': signature,
            'Content-Type': 'application/json',
          },
        });
        console.log(`[CheckVN Mock] Successfully processed callback for batch ${batchId}`);
      } catch (err: any) {
        console.error('[CheckVN Mock Error] Webhook callback failed:', err.message);
      }
    }, 2000);
  }

  async handleWebhook(payload: any, signature: string): Promise<void> {
    // 1. Xác thực HMAC chữ ký
    const secret = this.getWebhookSecret();
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(computedSignature, 'utf-8'),
      Buffer.from(signature, 'utf-8')
    );

    if (!isValid) {
      throw new AppError('UNAUTHORIZED', 401, 'Chữ ký Webhook không hợp lệ');
    }

    // 2. Tìm lô hàng khớp checkvn_batch_id
    const batch = await checkvnQrRepository.findByCheckvnBatchId(payload.checkvn_batch_id);
    if (!batch) {
      throw new AppError('BATCH_NOT_FOUND', 404, 'Không tìm thấy lô hàng tương ứng với mã CheckVN cung cấp');
    }

    // Idempotency: Kiểm tra trạng thái lô hàng
    if (batch.status !== 'PENDING_QR') {
      console.log(`[Webhook] Batch ${batch.id} is already in state ${batch.status}. Skipping.`);
      return;
    }

    // 3. DB Transaction lưu QR và cập nhật trạng thái Batch sang QR_RECEIVED
    await checkvnQrRepository.saveQrCodesAndCompleteBatch(batch.id, payload.qr_codes, payload.checkvn_batch_id);
  }

  async activateBatch(id: string, note: string, user: any): Promise<void> {
    const batch = await this.getBatchById(id, user);

    if (batch.status !== 'QR_RECEIVED') {
      throw new AppError('INVALID_STATUS', 400, 'Chỉ được phép kích hoạt lô hàng đã tiếp nhận dải mã QR');
    }

    await checkvnQrRepository.activateBatchAndQrCodes(id, note);
  }

  async recallBatch(id: string, reason: string, user: any): Promise<void> {
    const batch = await this.getBatchById(id, user);

    await checkvnQrRepository.recallBatchAndQrCodes(id, reason);

    // Vô hiệu hóa cache Redis của toàn bộ mã QR của lô bị thu hồi
    try {
      const redis = await getRedisClient();
      if (batch.qr_codes && batch.qr_codes.length > 0) {
        for (const qr of batch.qr_codes) {
          await redis.del(`qr:trace:${qr.code}`);
        }
      }
    } catch (error) {
      console.error('[Redis Error] Failed to invalidate QR trace cache:', error);
    }
  }

  async getPublicTrace(qrCode: string): Promise<any> {
    const cacheKey = `qr:trace:${qrCode}`;

    try {
      const redis = await getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('[Redis Error] Failed to get trace cache:', error);
    }

    const qr = await checkvnQrRepository.findQrByCode(qrCode);
    if (!qr) {
      throw new AppError('QR_NOT_FOUND', 404, 'Mã QR không hợp lệ trong hệ thống');
    }

    // Ràng buộc trạng thái
    if (qr.status === 'INACTIVE') {
      throw new AppError('QR_INACTIVE', 400, 'Sản phẩm này chưa được kích hoạt phân phối');
    }

    if (qr.status === 'RECALLED') {
      return {
        status: 'RECALLED',
        message: 'CẢNH BÁO: Sản phẩm này đã bị thu hồi bởi nhà sản xuất!',
        recall_reason: qr.batch.recall_reason,
        recalled_at: qr.recalled_at || qr.batch.recalled_at,
        product_name: qr.batch.batch_name,
      };
    }

    // Gom dữ liệu truy xuất nguồn gốc
    const season = qr.batch.season;
    const farmZone = season.farm_zone;
    const farmer = farmZone.farmer;
    const cooperative = farmer.cooperative;
    const farmingLogs = season.farming_logs || [];
    const carbonRecord = season.carbon_record;

    const traceData = {
      status: 'ACTIVE',
      qr_code: qr.code,
      batch: {
        batch_code: qr.batch.batch_code,
        batch_name: qr.batch.batch_name,
        packaging_unit: qr.batch.packaging_unit,
        total_weight_kg: qr.batch.total_weight_kg,
        product_description: qr.batch.product_description,
        activated_at: qr.batch.activated_at,
      },
      cooperative: {
        name: cooperative.name,
        address: cooperative.address,
        province: cooperative.province,
        district: cooperative.district,
      },
      farm_zone: {
        zone_name: farmZone.zone_name,
        area_sqm: farmZone.area_sqm,
        boundary: farmZone.boundary,
      },
      farmer: {
        full_name: farmer.full_name,
      },
      season: {
        season_name: season.season_name,
        crop_variety: season.crop_variety,
        start_date: season.start_date,
        actual_end_date: season.actual_end_date,
        actual_yield_kg: season.actual_yield_kg,
      },
      farming_logs: farmingLogs.map((log: any) => ({
        activity_date: log.activity_date,
        activity_type: log.activity_type,
        notes: log.notes,
        photo_urls: log.photo_urls,
      })),
      carbon_record: carbonRecord
        ? {
            total_emitted_kg: carbonRecord.total_emitted_kg,
            total_sequestered_kg: carbonRecord.total_sequestered_kg,
            net_carbon_tCO2e: carbonRecord.net_carbon_tCO2e,
            status: carbonRecord.status,
            credit_amount_tCO2e: carbonRecord.credit_amount_tCO2e,
          }
        : null,
    };

    try {
      const redis = await getRedisClient();
      await redis.set(cacheKey, JSON.stringify(traceData), { EX: 300 });
    } catch (error) {
      console.error('[Redis Error] Failed to write trace cache:', error);
    }

    return traceData;
  }
}

export const checkvnQrService = new CheckvnQrService();
```

**Step 2: Commit**
```bash
git add src/modules/checkvn-qr/checkvn-qr.service.ts
git commit -m "feat: implement CheckvnQrService with mock async webhook and redis caching"
```

---

### Task 4: Triển khai Controller & Router

**Files:**
- Modify: `d:/Downloads/agri-system/BackEnd/src/modules/checkvn-qr/checkvn-qr.controller.ts`
- Modify: `d:/Downloads/agri-system/BackEnd/src/modules/checkvn-qr/checkvn-qr.router.ts`

**Step 1: Viết Controller**
Sửa đổi `checkvn-qr.controller.ts` để kết nối Express req/res với các service tương ứng.

```typescript
import { Request, Response, NextFunction } from 'express';
import { checkvnQrService } from './checkvn-qr.service';
import responseHelper from '../../shared/utils/response.helper';

export class CheckvnQrController {
  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const batches = await checkvnQrService.getAllBatches(req.user);
      responseHelper.success(res, batches);
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const batch = await checkvnQrService.getBatchById(req.params.id, req.user);
      responseHelper.success(res, batch);
    } catch (error) {
      next(error);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const batch = await checkvnQrService.createBatch(req.body, req.user);
      responseHelper.success(res, batch, 201);
    } catch (error) {
      next(error);
    }
  };

  public requestQr = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await checkvnQrService.requestQrCodes(req.params.id, req.user);
      // Trả về 202 Accepted theo đặc tả NFR-01
      responseHelper.success(res, result, 202);
    } catch (error) {
      next(error);
    }
  };

  public webhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const signature = req.headers['x-checkvn-signature'] as string;
      if (!signature) {
        responseHelper.error(res, 'UNAUTHORIZED', 'Thiếu chữ ký Webhook', [], 401);
        return;
      }
      await checkvnQrService.handleWebhook(req.body, signature);
      responseHelper.success(res, { status: 'success' });
    } catch (error) {
      next(error);
    }
  };

  public getQrList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const batch = await checkvnQrService.getBatchById(req.params.id, req.user);
      responseHelper.success(res, batch.qr_codes || []);
    } catch (error) {
      next(error);
    }
  };

  public activate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await checkvnQrService.activateBatch(req.params.id, req.body.activation_note, req.user);
      responseHelper.success(res, { message: 'Kích hoạt lô hàng thành công' });
    } catch (error) {
      next(error);
    }
  };

  public recall = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await checkvnQrService.recallBatch(req.params.id, req.body.recall_reason, req.user);
      responseHelper.success(res, { message: 'Thu hồi lô hàng thành công' });
    } catch (error) {
      next(error);
    }
  };

  public trace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const traceData = await checkvnQrService.getPublicTrace(req.params.qrCode);
      responseHelper.success(res, traceData);
    } catch (error) {
      next(error);
    }
  };
}

export const checkvnQrController = new CheckvnQrController();
```

**Step 2: Viết Router**
Sửa đổi `checkvn-qr.router.ts` để phân quyền bảo vệ routes.

```typescript
import { Router } from 'express';
import { checkvnQrController } from './checkvn-qr.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../../shared/pipes/validate.pipe';
import { CreateBatchDto, ActivateBatchDto, RecallBatchDto, WebhookQrDto } from './checkvn-qr.dto';
import { UserRole } from '@prisma/client';

const router = Router();

// 1. Webhook & Public trace (Không cần đăng nhập)
router.post('/webhook', validateBody(WebhookQrDto), checkvnQrController.webhook);
router.get('/public/trace/:qrCode', checkvnQrController.trace);

// 2. Các route quản trị (Yêu cầu đăng nhập HTX_MANAGER hoặc SUPER_ADMIN)
router.use(requireAuth);
router.use(requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER));

router.get('/batches', checkvnQrController.getAll);
router.get('/batches/:id', checkvnQrController.getById);
router.post('/batches', validateBody(CreateBatchDto), checkvnQrController.create);
router.post('/batches/:id/request', checkvnQrController.requestQr);
router.get('/batches/:id/qr', checkvnQrController.getQrList);
router.post('/batches/:id/activate', validateBody(ActivateBatchDto), checkvnQrController.activate);
router.post('/batches/:id/recall', validateBody(RecallBatchDto), checkvnQrController.recall);

export default router;
```

**Step 3: Commit**
```bash
git add src/modules/checkvn-qr/checkvn-qr.controller.ts src/modules/checkvn-qr/checkvn-qr.router.ts
git commit -m "feat: implement CheckvnQr routing and controllers with RBAC guards"
```

---

### Task 5: Viết Unit & Integration Tests cho Module CheckvnQr

**Files:**
- Modify: `d:/Downloads/agri-system/BackEnd/src/modules/checkvn-qr/checkvn-qr.test.ts`

**Step 1: Triển khai kiểm thử đầy đủ luồng**
Viết file test mô phỏng toàn bộ tiến trình từ tạo lô hàng, gửi bất đồng bộ, webhook check HMAC, kích hoạt, thu hồi, và tra cứu cache Redis.

```typescript
import { checkvnQrService } from './checkvn-qr.service';
import { checkvnQrRepository } from './checkvn-qr.repository';
import { seasonRepository } from '../season/season.repository';
import { getRedisClient } from '../../shared/utils/redis.client';
import { AppError } from '../../shared/utils/app-error';
import crypto from 'crypto';

jest.mock('./checkvn-qr.repository');
jest.mock('../season/season.repository');
jest.mock('../../shared/utils/redis.client');

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();

describe('CheckvnQr Module Service', () => {
  const mockUserManager = { id: 'user-manager', role: 'HTX_MANAGER', cooperativeId: 'coop-1' };
  
  const mockSeason = {
    id: 'season-1',
    status: 'COMPLETED',
    actual_yield_kg: 5000,
    farm_zone_id: 'zone-1',
    farm_zone: {
      farm_zone_code: 'Z1',
      farmer: {
        cooperative_id: 'coop-1',
        cooperative: { name: 'HTX A', address: 'HN', province: 'HN', district: 'HN' }
      }
    }
  };

  const mockBatch = {
    id: 'batch-1',
    batch_code: 'Z1-20260610-001',
    season_id: 'season-1',
    batch_name: 'Gao Thom',
    status: 'DRAFT',
    total_weight_kg: 1000,
    quantity_qr_requested: 5,
    packaging_unit: 'Tui 5kg',
    season: mockSeason
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockResolvedValue({
      get: mockRedisGet,
      set: mockRedisSet,
      del: mockRedisDel,
    });
  });

  describe('createBatch', () => {
    it('should create batch successfully under valid conditions', async () => {
      (seasonRepository.findById as jest.Mock).mockResolvedValue(mockSeason);
      (checkvnQrRepository.countByZoneAndDate as jest.Mock).mockResolvedValue(0);
      (checkvnQrRepository.createBatch as jest.Mock).mockResolvedValue(mockBatch);

      const result = await checkvnQrService.createBatch({
        season_id: 'season-1',
        batch_name: 'Gao Thom',
        total_weight_kg: 1000,
        quantity_qr_requested: 5,
        packaging_unit: 'Tui 5kg',
      }, mockUserManager);

      expect(result).toEqual(mockBatch);
      expect(checkvnQrRepository.createBatch).toHaveBeenCalled();
    });

    it('should throw error if season yield exceeded', async () => {
      (seasonRepository.findById as jest.Mock).mockResolvedValue(mockSeason);

      await expect(checkvnQrService.createBatch({
        season_id: 'season-1',
        batch_name: 'Gao Thom',
        total_weight_kg: 6000, // vượt quá 5000
        quantity_qr_requested: 5,
        packaging_unit: 'Tui 5kg',
      }, mockUserManager)).rejects.toThrow(AppError);
    });
  });

  describe('webhook verification', () => {
    it('should reject webhook with invalid signature', async () => {
      const payload = { checkvn_batch_id: 'cvn-123', qr_codes: ['QR-1'] };
      
      await expect(checkvnQrService.handleWebhook(payload, 'wrong-signature'))
        .rejects.toThrow(AppError);
    });

    it('should accept valid webhook and save QR codes', async () => {
      const payload = { checkvn_batch_id: 'cvn-123', qr_codes: ['QR-1'] };
      const secret = 'checkvn_webhook_secret_key_default';
      const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

      (checkvnQrRepository.findByCheckvnBatchId as jest.Mock).mockResolvedValue({
        id: 'batch-1', status: 'PENDING_QR', checkvn_batch_id: 'cvn-123'
      });

      await checkvnQrService.handleWebhook(payload, signature);

      expect(checkvnQrRepository.saveQrCodesAndCompleteBatch).toHaveBeenCalledWith('batch-1', ['QR-1'], 'cvn-123');
    });
  });

  describe('public trace', () => {
    it('should return cached trace data if available', async () => {
      const mockTraceData = { status: 'ACTIVE', qr_code: 'QR-1' };
      mockRedisGet.mockResolvedValue(JSON.stringify(mockTraceData));

      const result = await checkvnQrService.getPublicTrace('QR-1');

      expect(mockRedisGet).toHaveBeenCalledWith('qr:trace:QR-1');
      expect(result).toEqual(mockTraceData);
    });
  });
});
```

**Step 2: Chạy kiểm thử để xác nhận tất cả các bài test đều pass**
Run: `npx jest src/modules/checkvn-qr/checkvn-qr.test.ts`
Expected: PASS

**Step 3: Commit**
```bash
git add src/modules/checkvn-qr/checkvn-qr.test.ts
git commit -m "test: add unit tests for CheckvnQr service logic and webhook security"
```

---

### Task 6: Chạy tích hợp toàn bộ hệ thống và build production

**Step 1: Chạy lại toàn bộ test suites**
Run: `npm run test`
Expected: 12/12 test suites pass.

**Step 2: Chạy build project**
Run: `npm run build`
Expected: Biên dịch TypeScript thành công không có lỗi.

**Step 3: Commit**
```bash
git commit --allow-empty -m "chore: verify build and pass all test suites for Phase 4 CheckVN QR"
```
