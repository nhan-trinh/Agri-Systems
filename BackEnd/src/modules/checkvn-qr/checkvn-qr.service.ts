import crypto from 'crypto';
import axios from 'axios';
import { checkvnQrRepository } from './checkvn-qr.repository';
import { seasonRepository } from '../season/season.repository';
import { harvestWarehouseService } from '../harvest-warehouse/harvest-warehouse.service';
import { AppError } from '../../shared/utils/app-error';
import { getRedisClient } from '../../shared/utils/redis.client';
import config from '../../config/app.config';
import { Batch, QrCode, BatchStatus, QrStatus } from '@prisma/client';
import { CreateBatchInput } from './checkvn-qr.dto';

// ==================== CONSTANTS ====================

const BATCH_LIST_TTL_SECONDS = 300;       // 5 minutes
const BATCH_DETAIL_TTL_SECONDS = 600;    // 10 minutes
const BATCH_QR_CODES_TTL_SECONDS = 300;  // 5 minutes

// ==================== SERVICE ====================

export class CheckvnQrService {

  // ==================== CACHE HELPERS ====================

  private async invalidateBatchCache(batchId?: string, cooperativeId?: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.del('batches:list:all');
      if (cooperativeId) {
        await redis.del(`batches:list:coop:${cooperativeId}`);
      }
      if (batchId) {
        await redis.del(`batches:detail:${batchId}`);
        await redis.del(`batches:qr-codes:${batchId}`);
      }
    } catch (error) {
      console.error('[Redis Error] Failed to invalidate batch cache:', error);
    }
  }

  private getBatchListCacheKey(user: any): string {
    if (user.role === 'SUPER_ADMIN') return 'batches:list:all';
    return `batches:list:coop:${user.cooperativeId}`;
  }

  private async invalidateQrCache(batchId: string): Promise<void> {
    try {
      const qrCodes = await checkvnQrRepository.getBatchQrCodes(batchId);
      if (qrCodes.length === 0) return;

      const redis = await getRedisClient();
      const keys = qrCodes.map((qr) => `qr:trace:${qr.code}`);
      await redis.del(keys);
    } catch (err: any) {
      console.error('[Redis Error] Failed to invalidate QR trace cache:', err.message);
    }
  }

  // ==================== QUERIES ====================

  public async getAllBatches(user: any): Promise<Batch[]> {
    const cacheKey = this.getBatchListCacheKey(user);

    // Try cache first
    try {
      const redis = await getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (error) {
      console.error('[Redis Error] Failed to get batch list cache:', error);
    }

    const batches = user.role === 'SUPER_ADMIN'
      ? await checkvnQrRepository.findAllBatches({})
      : await checkvnQrRepository.findAllBatches({ cooperativeId: user.cooperativeId });

    // Store in cache
    try {
      const redis = await getRedisClient();
      await redis.set(cacheKey, JSON.stringify(batches), { EX: BATCH_LIST_TTL_SECONDS });
    } catch (error) {
      console.error('[Redis Error] Failed to set batch list cache:', error);
    }

    return batches;
  }

  public async getBatchById(id: string, user: any): Promise<any> {
    // Try cache first
    try {
      const redis = await getRedisClient();
      const cached = await redis.get(`batches:detail:${id}`);
      if (cached) {
        const batch = JSON.parse(cached);
        // Still enforce RBAC on cached data
        const cooperativeId = batch.season.farm_zone.farmer.cooperative_id;
        if (user.role !== 'SUPER_ADMIN' && user.cooperativeId !== cooperativeId) {
          throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền truy cập thông tin lô hàng này');
        }
        return batch;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[Redis Error] Failed to get batch detail cache:', error);
    }

    const batch = await checkvnQrRepository.findBatchById(id);
    if (!batch) {
      throw new AppError('BATCH_NOT_FOUND', 404, 'Không tìm thấy lô hàng');
    }

    // RBAC check
    const cooperativeId = batch.season.farm_zone.farmer.cooperative_id;
    if (user.role !== 'SUPER_ADMIN' && user.cooperativeId !== cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền truy cập thông tin lô hàng này');
    }

    // Store in cache
    try {
      const redis = await getRedisClient();
      await redis.set(`batches:detail:${id}`, JSON.stringify(batch), { EX: BATCH_DETAIL_TTL_SECONDS });
    } catch (error) {
      console.error('[Redis Error] Failed to set batch detail cache:', error);
    }

    return batch;
  }

  public async getBatchQrCodes(batchId: string, user: any): Promise<QrCode[]> {
    // Try cache first
    try {
      const redis = await getRedisClient();
      const cached = await redis.get(`batches:qr-codes:${batchId}`);
      if (cached) return JSON.parse(cached);
    } catch (error) {
      console.error('[Redis Error] Failed to get batch QR codes cache:', error);
    }

    const batch = await checkvnQrRepository.findBatchById(batchId);
    if (!batch) {
      throw new AppError('BATCH_NOT_FOUND', 404, 'Không tìm thấy lô hàng');
    }

    // RBAC check
    const cooperativeId = batch.season.farm_zone.farmer.cooperative_id;
    if (user.role !== 'SUPER_ADMIN' && user.cooperativeId !== cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền truy cập danh sách QR của lô hàng này');
    }

    const qrCodes = await checkvnQrRepository.getBatchQrCodes(batchId);

    // Store in cache
    try {
      const redis = await getRedisClient();
      await redis.set(`batches:qr-codes:${batchId}`, JSON.stringify(qrCodes), { EX: BATCH_QR_CODES_TTL_SECONDS });
    } catch (error) {
      console.error('[Redis Error] Failed to set batch QR codes cache:', error);
    }

    return qrCodes;
  }

  // ==================== MUTATIONS ====================

  public async createBatch(data: CreateBatchInput, user: any): Promise<Batch> {
    // 1. Kiểm tra vụ mùa tồn tại
    const season = await seasonRepository.findById(data.season_id);
    if (!season) {
      throw new AppError('SEASON_NOT_FOUND', 404, 'Không tìm thấy vụ mùa');
    }

    // 2. BR-004-1: Vụ mùa phải hoàn thành (COMPLETED)
    if (season.status !== 'COMPLETED') {
      throw new AppError('SEASON_NOT_COMPLETED', 422, 'Vụ mùa chưa hoàn thành (COMPLETED)');
    }

    // 3. BR-004-2: Mỗi vụ mùa chỉ có 1 lô hàng duy nhất
    const existingBatch = await checkvnQrRepository.findBatchBySeasonId(data.season_id);
    if (existingBatch) {
      throw new AppError('BATCH_ALREADY_EXISTS', 422, 'Vụ mùa này đã được tạo lô hàng trước đó');
    }

    // 4. BR-004-3: Khối lượng lô hàng không vượt quá sản lượng thu hoạch thực tế
    const actualYield = season.actual_yield_kg || 0;
    if (data.total_weight_kg > actualYield) {
      throw new AppError('WEIGHT_EXCEEDS_YIELD', 422, `Khối lượng lô hàng vượt quá sản lượng thu hoạch thực tế của vụ mùa (${actualYield} kg)`);
    }

    // Kiểm tra quyền sở hữu hợp tác xã (HTX_MANAGER/FARMER phải thuộc cùng cooperative)
    const cooperativeId = season.farm_zone.farmer.cooperative_id;
    if (user.role !== 'SUPER_ADMIN' && user.cooperativeId !== cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền tạo lô hàng cho vụ mùa này');
    }

    // 5. FR-09: Vụ mùa phải có ít nhất một lần nông sản được xác nhận nhập vào kho
    //    (Harvest Warehouse) trước khi được phép tạo lô hàng QR — tránh cấp QR cho
    //    sản phẩm chưa từng được nhận vào kho.
    await harvestWarehouseService.assertSeasonHasReceivedStock(data.season_id, cooperativeId);

    // 6. BR-004-4: Tự động sinh batch_code: ZONE_CODE-YYYYMMDD-NNN
    const farmZoneCode = season.farm_zone.farm_zone_code;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateString = `${yyyy}${mm}${dd}`;
    const prefix = `${farmZoneCode}-${dateString}-`;

    const existingBatches = await checkvnQrRepository.findBatchesByCodePrefix(prefix);

    let maxNum = 0;
    for (const b of existingBatches) {
      const parts = b.batch_code.split('-');
      const numPart = parts[parts.length - 1];
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
    const nextNum = String(maxNum + 1).padStart(3, '0');
    const batchCode = `${prefix}${nextNum}`;

    // 7. Tạo batch trong DB với status DRAFT
    const batch = await checkvnQrRepository.createBatch({
      season_id: data.season_id,
      batch_code: batchCode,
      batch_name: data.batch_name,
      total_weight_kg: data.total_weight_kg,
      quantity_qr_requested: data.quantity_qr,
      packaging_unit: data.packaging_unit,
      product_description: data.product_description,
      created_by: user.farmerId || user.userId,
    });

    // Invalidate list caches (new record, no detail key yet)
    await this.invalidateBatchCache(undefined, cooperativeId);

    return batch;
  }

  public async requestQrCode(batchId: string, user: any): Promise<{ checkvn_batch_id: string }> {
    const batch = await checkvnQrRepository.findBatchById(batchId);
    if (!batch) {
      throw new AppError('BATCH_NOT_FOUND', 404, 'Không tìm thấy lô hàng');
    }

    // BR-CVN-001: Chỉ HTX_MANAGER mới được yêu cầu
    // Kiểm tra quyền sở hữu hợp tác xã
    const farmZone = batch.season.farm_zone;
    const farmer = farmZone.farmer;
    const cooperativeId = farmer.cooperative_id;

    if (user.role !== 'SUPER_ADMIN') {
      if (user.role !== 'HTX_MANAGER' || user.cooperativeId !== cooperativeId) {
        throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền thực hiện yêu cầu cấp QR cho lô hàng này');
      }
    }

    // Kiểm tra trạng thái DRAFT
    if (batch.status !== BatchStatus.DRAFT) {
      throw new AppError('INVALID_STATUS', 400, 'Chỉ có thể yêu cầu cấp QR cho lô hàng ở trạng thái DRAFT');
    }

    // Tạo checkvn_batch_id giả lập
    const checkvnBatchId = `CVN-${Date.now()}`;

    // Cập nhật trạng thái batch -> PENDING_QR
    await checkvnQrRepository.updateBatchStatus(batchId, BatchStatus.PENDING_QR, {
      checkvn_batch_id: checkvnBatchId,
    });

    // Invalidate caches (status changed)
    await this.invalidateBatchCache(batchId, cooperativeId);

    // Kích hoạt luồng giả lập CheckVN gửi webhook sau 2 giây
    this.triggerMockCheckvnWebhook(batchId, checkvnBatchId, batch.batch_code, batch.quantity_qr_requested);

    return { checkvn_batch_id: checkvnBatchId };
  }

  public async processWebhook(payload: any, signature: string): Promise<{ message: string }> {
    // 1. Xác thực chữ ký HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', config.checkvn.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new AppError('UNAUTHORIZED', 401, 'Chữ ký webhook không hợp lệ');
    }

    // 2. Tìm lô hàng theo checkvn_batch_id
    const batch = await checkvnQrRepository.findBatchByCheckvnId(payload.checkvn_batch_id);
    if (!batch) {
      throw new AppError('BATCH_NOT_FOUND', 404, 'Không tìm thấy lô hàng liên kết với mã CheckVN');
    }

    // 3. Kiểm tra trạng thái phải là PENDING_QR
    if (batch.status !== BatchStatus.PENDING_QR) {
      throw new AppError('INVALID_STATUS', 400, 'Lô hàng không trong trạng thái chờ cấp QR');
    }

    // 4. Lưu danh sách QR codes ở trạng thái INACTIVE trong transaction
    await checkvnQrRepository.saveQrCodesTransaction(batch.id, payload.qr_codes);

    // Invalidate caches (QR codes added, status changed to QR_RECEIVED)
    // Fetch full batch with includes for cooperative_id needed by cache invalidation
    const batchWithIncludes = await checkvnQrRepository.findBatchById(batch.id);
    const cooperativeId = batchWithIncludes?.season.farm_zone.farmer.cooperative_id;
    await this.invalidateBatchCache(batch.id, cooperativeId);

    return { message: 'Webhook processed successfully' };
  }

  public async activateBatch(batchId: string, note: string | undefined, user: any): Promise<void> {
    const batch = await checkvnQrRepository.findBatchById(batchId);
    if (!batch) {
      throw new AppError('BATCH_NOT_FOUND', 404, 'Không tìm thấy lô hàng');
    }

    // Kiểm tra trạng thái QR_RECEIVED
    if (batch.status !== BatchStatus.QR_RECEIVED) {
      throw new AppError('INVALID_STATUS', 400, 'Lô hàng không ở trạng thái QR_RECEIVED để kích hoạt');
    }

    // Kiểm tra quyền
    const cooperativeId = batch.season.farm_zone.farmer.cooperative_id;
    if (user.role !== 'SUPER_ADMIN') {
      if (user.role !== 'HTX_MANAGER' || user.cooperativeId !== cooperativeId) {
        throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền kích hoạt lô hàng này');
      }
    }

    // Kích hoạt lô hàng và toàn bộ mã QR trong transaction
    await checkvnQrRepository.activateBatchTransaction(batchId, note);

    // Invalidate batch caches + QR trace caches
    await this.invalidateBatchCache(batchId, cooperativeId);
    await this.invalidateQrCache(batchId);
  }

  public async recallBatch(batchId: string, reason: string, user: any): Promise<void> {
    const batch = await checkvnQrRepository.findBatchById(batchId);
    if (!batch) {
      throw new AppError('BATCH_NOT_FOUND', 404, 'Không tìm thấy lô hàng');
    }

    // Kiểm tra trạng thái ACTIVE
    if (batch.status !== BatchStatus.ACTIVE) {
      throw new AppError('INVALID_STATUS', 400, 'Chỉ có thể thu hồi lô hàng đang hoạt động (ACTIVE)');
    }

    // Kiểm tra quyền (HTX_MANAGER hoặc SUPER_ADMIN)
    const cooperativeId = batch.season.farm_zone.farmer.cooperative_id;
    if (user.role !== 'SUPER_ADMIN') {
      if (user.role !== 'HTX_MANAGER' || user.cooperativeId !== cooperativeId) {
        throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền thu hồi lô hàng này');
      }
    }

    // Thu hồi lô hàng và toàn bộ mã QR trong transaction
    await checkvnQrRepository.recallBatchTransaction(batchId, reason);

    // Invalidate batch caches + QR trace caches
    await this.invalidateBatchCache(batchId, cooperativeId);
    await this.invalidateQrCache(batchId);
  }

  // ==================== PUBLIC (no auth) ====================

  public async publicTrace(qrCodeValue: string): Promise<any> {
    const cacheKey = `qr:trace:${qrCodeValue}`;

    // 1. Thử lấy từ cache Redis
    try {
      const redis = await getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Tăng scan_count trong background
        this.incrementScanInBackground(parsed.qrCodeId);
        return parsed.traceData;
      }
    } catch (err: any) {
      console.error('[Redis Error] Failed to fetch trace cache:', err.message);
    }

    // 2. Không có cache -> truy vấn DB
    const qrCode = await checkvnQrRepository.findQrCodeWithTrace(qrCodeValue);
    if (!qrCode) {
      throw new AppError('QR_NOT_FOUND', 404, 'Mã QR không tồn tại trong hệ thống');
    }

    // 3. Xử lý theo trạng thái của mã QR
    if (qrCode.status === QrStatus.INACTIVE) {
      return {
        status: QrStatus.INACTIVE,
        message: 'Mã QR chưa được kích hoạt',
      };
    }

    if (qrCode.status === QrStatus.RECALLED) {
      return {
        status: QrStatus.RECALLED,
        message: 'Lô hàng đã bị thu hồi',
        recall_reason: qrCode.batch.recall_reason,
        recalled_at: qrCode.batch.recalled_at,
      };
    }

    // Trạng thái ACTIVE -> Trả về thông tin đầy đủ
    const traceData = {
      status: QrStatus.ACTIVE,
      batch: {
        batch_code: qrCode.batch.batch_code,
        batch_name: qrCode.batch.batch_name,
        total_weight_kg: qrCode.batch.total_weight_kg,
        packaging_unit: qrCode.batch.packaging_unit,
        product_description: qrCode.batch.product_description,
        created_at: qrCode.batch.created_at,
        activated_at: qrCode.batch.activated_at,
      },
      season: {
        season_name: qrCode.batch.season.season_name,
        crop_variety: qrCode.batch.season.crop_variety,
        start_date: qrCode.batch.season.start_date,
        actual_end_date: qrCode.batch.season.actual_end_date,
        actual_yield_kg: qrCode.batch.season.actual_yield_kg,
      },
      farm_zone: {
        zone_name: qrCode.batch.season.farm_zone.zone_name,
        farm_zone_code: qrCode.batch.season.farm_zone.farm_zone_code,
        area_sqm: qrCode.batch.season.farm_zone.area_sqm,
        boundary: qrCode.batch.season.farm_zone.boundary,
      },
      farmer: {
        full_name: qrCode.batch.season.farm_zone.farmer.full_name,
        address: qrCode.batch.season.farm_zone.farmer.address,
      },
      cooperative: {
        name: qrCode.batch.season.farm_zone.farmer.cooperative.name,
        address: qrCode.batch.season.farm_zone.farmer.cooperative.address,
        phone: qrCode.batch.season.farm_zone.farmer.cooperative.phone,
      },
      farming_logs: qrCode.batch.season.farming_logs.map((log: any) => ({
        activity_date: log.activity_date,
        activity_type: log.activity_type,
        notes: log.notes,
        photo_urls: log.photo_urls,
        fertilizer_type: log.fertilizer_type,
        quantity_kg: log.quantity_kg,
        product_name: log.product_name,
        dosage: log.dosage,
        unit: log.unit,
        water_volume_m3: log.water_volume_m3,
        duration_hours: log.duration_hours,
        yield_kg: log.yield_kg,
        harvest_method: log.harvest_method,
      })),
    };

    const cacheValue = {
      qrCodeId: qrCode.id,
      traceData,
    };

    // 4. Lưu vào Redis cache (5 phút)
    try {
      const redis = await getRedisClient();
      await redis.set(cacheKey, JSON.stringify(cacheValue), { EX: 300 });
    } catch (err: any) {
      console.error('[Redis Error] Failed to write trace cache:', err.message);
    }

    // 5. Tăng scan_count trong background
    this.incrementScanInBackground(qrCode.id);

    return traceData;
  }

  // ==================== PRIVATE HELPERS ====================

  private incrementScanInBackground(qrCodeId: string): void {
    checkvnQrRepository.incrementQrScanCount(qrCodeId).catch((err) => {
      console.error('[Background Task Error] Failed to increment scan count:', err.message);
    });
  }

  private triggerMockCheckvnWebhook(batchId: string, checkvnBatchId: string, batchCode: string, quantity: number): void {
    setTimeout(async () => {
      try {
        const qrCodes = Array.from({ length: quantity }, (_, i) => {
          const suffix = String(i + 1).padStart(4, '0');
          return `${config.appUrl}/public/trace/${batchCode}-${suffix}`;
        });

        const webhookPayload = {
          checkvn_batch_id: checkvnBatchId,
          qr_codes: qrCodes,
        };

        const signature = crypto
          .createHmac('sha256', config.checkvn.webhookSecret)
          .update(JSON.stringify(webhookPayload))
          .digest('hex');

        const webhookUrl = `${config.appUrl}/api/${config.apiVersion}/qr/webhook`;

        await axios.post(webhookUrl, webhookPayload, {
          headers: {
            'Content-Type': 'application/json',
            'X-CheckVN-Signature': signature,
          },
        });
        console.log(`[CheckVN Mock] Simulated webhook callback success for batch ${batchId}`);
      } catch (err: any) {
        console.error(`[CheckVN Mock Error] Webhook simulation failed for batch ${batchId}:`, err.message);
      }
    }, 2000);
  }
}

export const checkvnQrService = new CheckvnQrService();
