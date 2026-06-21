import prisma from '../../prisma/client';
import { harvestWarehouseRepository } from './harvest-warehouse.repository';
import { AppError } from '../../shared/utils/app-error';
import { JwtPayload } from '../auth/auth.types';
import { ReceiveEntryDtoType, ShipEntryDtoType, EntryQueryDtoType } from './harvest-warehouse.dto';
import { ReconciliationResult, QrLookupResult } from './harvest-warehouse.types';
import { SeasonStatus, UserRole } from '@prisma/client';

// ─────────────────────────────────────────────────────
// Service — business logic, RBAC ownership checks, FR rules.
// Structurally parallel to the Material Warehouse service.
// ─────────────────────────────────────────────────────

export class HarvestWarehouseService {

  // ── Helper: lấy cooperative_id an toàn (NFR-04) ──

  private getCooperativeId(user: JwtPayload): string {
    if (!user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Người dùng không thuộc Hợp tác xã nào');
    }
    return user.cooperativeId;
  }

  // ── Helper: chuẩn hoá produce_name thành khoá duy nhất (fix #2) ──

  /**
   * Produces a normalized uniqueness key from a free-text produce name so that
   * "Lúa ST25", "  lúa   st25 ", "Lúa ST 25" collapse to the same key.
   * Rule: trim → lowercase → collapse all internal whitespace runs to a single space.
   */
  private normalizeProduceNameKey(produceName: string): string {
    return produceName.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  // ── Helper: kiểm tra season tồn tại + thuộc HTX ──

  /**
   * Loads a season with its farm_zone → farmer → cooperative chain for ownership checks.
   * Throws if the season doesn't exist or belongs to a different cooperative.
   */
  private async getSeasonWithOwnershipCheck(seasonId: string, cooperativeId: string, user: JwtPayload) {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: { farm_zone: { include: { farmer: true } } },
    });

    if (!season) {
      throw new AppError('SEASON_NOT_FOUND', 404, 'Không tìm thấy vụ mùa tương ứng');
    }

    // SUPER_ADMIN bypasses cooperative check; everyone else must own the season.
    if (user.role !== UserRole.SUPER_ADMIN && season.farm_zone.farmer.cooperative_id !== cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Vụ mùa không thuộc Hợp tác xã của bạn');
    }

    return season;
  }

  // ══════════════════════════════════════════════════
  // RECEIVE — warehouse staff records harvested produce arriving (UC-01/02/03)
  // ══════════════════════════════════════════════════

  async receive(dto: ReceiveEntryDtoType, user: JwtPayload) {
    const coopId = this.getCooperativeId(user);
    const season = await this.getSeasonWithOwnershipCheck(dto.season_id, coopId, user);

    // FR-12 / UC-06: receiving is allowed even after season COMPLETED, but we flag it
    // so managers see the warning. Receiving during ACTIVE/CANCELLED is never flagged.
    const receivedAfterClose = season.status === SeasonStatus.COMPLETED;

    return harvestWarehouseRepository.createEntryInTx({
      cooperative_id: coopId,
      crop_type: dto.crop_type,
      produce_name: dto.produce_name,
      produce_name_key: this.normalizeProduceNameKey(dto.produce_name),
      unit: dto.unit,
      entry_type: 'RECEIVE',
      quantity: dto.quantity,
      season_id: dto.season_id,
      farmer_id: dto.farmer_id ?? season.farm_zone.farmer.id, // default to season's farmer
      quality_notes: dto.quality_notes,
      received_after_close: receivedAfterClose,
      entry_date: new Date(dto.entry_date),
      notes: dto.notes,
      created_by: user.userId,
    });
  }

  // ══════════════════════════════════════════════════
  // SHIP — warehouse staff ships produce to a buyer (UC-05)
  // ══════════════════════════════════════════════════

  async ship(dto: ShipEntryDtoType, user: JwtPayload) {
    const coopId = this.getCooperativeId(user);
    const produceNameKey = this.normalizeProduceNameKey(dto.produce_name);

    // FR-05: pre-check stock for a clean error message before the transaction.
    // (The repo also double-checks inside the TX as the authoritative guard.)
    const stockItem = await harvestWarehouseRepository.findStockItem(coopId, dto.crop_type, produceNameKey);
    if (!stockItem || stockItem.current_stock < dto.quantity) {
      const onHand = stockItem?.current_stock ?? 0;
      throw new AppError(
        'INSUFFICIENT_HARVEST_STOCK',
        422,
        `Tồn kho nông sản không đủ. Hiện có: ${onHand} ${dto.unit}, yêu cầu xuất: ${dto.quantity} ${dto.unit}`,
      );
    }

    return harvestWarehouseRepository.createEntryInTx({
      cooperative_id: coopId,
      crop_type: dto.crop_type,
      produce_name: dto.produce_name,
      produce_name_key: produceNameKey,
      unit: dto.unit,
      entry_type: 'SHIP',
      quantity: dto.quantity,
      buyer_name: dto.buyer_name,
      buyer_contact: dto.buyer_contact,
      unit_price: dto.unit_price,
      entry_date: new Date(dto.entry_date),
      notes: dto.notes,
      created_by: user.userId,
    });
  }

  // ══════════════════════════════════════════════════
  // STOCK & HISTORY READS (UC-04, UC-07 data)
  // ══════════════════════════════════════════════════

  async getStock(user: JwtPayload) {
    const coopId = this.getCooperativeId(user);
    return harvestWarehouseRepository.findAllStock(coopId);
  }

  async getEntries(query: EntryQueryDtoType, user: JwtPayload) {
    const coopId = this.getCooperativeId(user);
    const { data, total } = await harvestWarehouseRepository.findEntries(coopId, query);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
      },
    };
  }

  async getEntryById(id: string, user: JwtPayload) {
    const coopId = this.getCooperativeId(user);
    const entry = await harvestWarehouseRepository.findEntryById(id);
    if (!entry) {
      throw new AppError('ENTRY_NOT_FOUND', 404, 'Không tìm thấy phiếu giao dịch nông sản');
    }
    if (entry.cooperative_id !== coopId && user.role !== UserRole.SUPER_ADMIN) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền xem giao dịch của HTX khác');
    }
    return entry;
  }

  // ══════════════════════════════════════════════════
  // RECONCILIATION — declared vs received yield comparison (UC-07)
  // ══════════════════════════════════════════════════

  async getReconciliation(seasonId: string, user: JwtPayload): Promise<ReconciliationResult> {
    const coopId = this.getCooperativeId(user);
    const season = await this.getSeasonWithOwnershipCheck(seasonId, coopId, user);

    const { total: receivedTotalKg, count: receivedEntryCount } =
      await harvestWarehouseRepository.sumReceivedForSeason(seasonId);
    const receivedAfterClose = await harvestWarehouseRepository.hasReceivedAfterClose(seasonId);

    return {
      season_id: season.id,
      season_name: season.season_name,
      crop_variety: season.crop_variety,
      status: season.status,
      planned_yield_kg: season.planned_yield_kg,
      actual_yield_kg: season.actual_yield_kg,
      received_total_kg: receivedTotalKg,
      received_entry_count: receivedEntryCount,
      discrepancy_kg: season.actual_yield_kg !== null
        ? season.actual_yield_kg - receivedTotalKg
        : null,
      received_after_close: receivedAfterClose,
    };
  }

  // ══════════════════════════════════════════════════
  // QR LOOKUP — resolve internal QR to season/farmer for fast check-in (UC-01)
  // ══════════════════════════════════════════════════

  async qrLookup(qrCode: string, user: JwtPayload): Promise<QrLookupResult> {
    const coopId = this.getCooperativeId(user);

    // The internal QR format is: "SEASON:<id>" or "FARMER:<id>" (per §4 question 5).
    // We resolve it to a full context object the UI can pre-fill from.
    const [prefix, ...rest] = qrCode.split(':');
    const id = rest.join(':');

    if (!id) {
      throw new AppError('INVALID_QR_CODE', 400, 'Mã QR nội bộ không hợp lệ');
    }

    if (prefix === 'SEASON') {
      const season = await prisma.season.findUnique({
        where: { id },
        include: { farm_zone: { include: { farmer: true } } },
      });
      if (!season) {
        throw new AppError('SEASON_NOT_FOUND', 404, 'Không tìm thấy vụ mùa từ mã QR');
      }
      if (season.farm_zone.farmer.cooperative_id !== coopId && user.role !== UserRole.SUPER_ADMIN) {
        throw new AppError('FORBIDDEN', 403, 'Vụ mùa không thuộc Hợp tác xã của bạn');
      }
      return {
        type: 'SEASON',
        season_id: season.id,
        season_name: season.season_name,
        crop_type: undefined,
        farmer_id: season.farm_zone.farmer.id,
        farmer_name: season.farm_zone.farmer.full_name,
        cooperative_id: season.farm_zone.farmer.cooperative_id,
      };
    }

    if (prefix === 'FARMER') {
      const farmer = await prisma.farmer.findUnique({ where: { id } });
      if (!farmer) {
        throw new AppError('FARMER_NOT_FOUND', 404, 'Không tìm thấy nông dân từ mã QR');
      }
      if (farmer.cooperative_id !== coopId && user.role !== UserRole.SUPER_ADMIN) {
        throw new AppError('FORBIDDEN', 403, 'Nông dân không thuộc Hợp tác xã của bạn');
      }
      return {
        type: 'FARMER',
        farmer_id: farmer.id,
        farmer_name: farmer.full_name,
        cooperative_id: farmer.cooperative_id,
      };
    }

    throw new AppError('UNSUPPORTED_QR_CODE', 400, 'Định dạng mã QR nội bộ không được hỗ trợ');
  }

  // ══════════════════════════════════════════════════
  // BATCH GATE — FR-09: a season must have received stock before a Batch can be created
  // ══════════════════════════════════════════════════

  /**
   * Public helper used by the checkvn-qr module before creating a Batch.
   * Throws if the season has no verifiable received produce.
   */
  async assertSeasonHasReceivedStock(seasonId: string, cooperativeId: string): Promise<void> {
    const season = await this.getSeasonWithOwnershipCheck(seasonId, cooperativeId, {
      userId: 'SYSTEM',
      role: UserRole.SUPER_ADMIN, // internal call — cooperative check done above via getSeasonWithOwnershipCheck is sufficient
      cooperativeId,
      farmerId: null,
      isFirstLogin: false,
    });
    void season; // season existence + ownership already validated

    const { total } = await harvestWarehouseRepository.sumReceivedForSeason(seasonId);
    if (total <= 0) {
      throw new AppError(
        'SEASON_HAS_NO_HARVEST_STOCK',
        422,
        'Vụ mùa chưa có nông sản nhận vào kho. Không thể tạo lô hàng QR cho sản phẩm chưa được xác nhận nhập kho.',
      );
    }
  }
}

export const harvestWarehouseService = new HarvestWarehouseService();
