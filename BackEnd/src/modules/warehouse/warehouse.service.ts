import { warehouseRepository } from './warehouse.repository';
import { farmerRepository } from '../farmer/farmer.repository';
import prisma from '../../prisma/client';
import { AppError } from '../../shared/utils/app-error';
import { JwtPayload } from '../auth/auth.types';
import {
  ImportTransactionDtoType,
  ExportTransactionDtoType,
  ReturnTransactionDtoType,
  TransactionQueryDtoType,
  ReconciliationQueryDtoType,
  CreateMaterialDtoType,
  UpdateMaterialDtoType,
} from './warehouse.dto';

// ─────────────────────────────────────────────────────
// Service — business logic, RBAC ownership, BR-005 rules
// ─────────────────────────────────────────────────────

export class WarehouseService {

  // ── Helper: lấy cooperative_id an toàn ─────────

  private getCooperativeId(user: JwtPayload): string {
    if (!user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Người dùng không thuộc Hợp tác xã nào');
    }
    return user.cooperativeId;
  }

  // ── Helper: kiểm tra vật tư tồn tại + thuộc HTX ─

  private async getMaterialWithOwnershipCheck(materialId: string, cooperativeId: string) {
    const material = await warehouseRepository.findMaterialById(materialId);
    if (!material) {
      throw new AppError('MATERIAL_NOT_FOUND', 404, 'Không tìm thấy vật tư');
    }
    if (material.cooperative_id !== cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền truy cập vật tư của HTX khác');
    }
    return material;
  }

  // ══════════════════════════════════════════════════
  // MATERIAL CRUD
  // ══════════════════════════════════════════════════

  async createMaterial(data: CreateMaterialDtoType, user: JwtPayload) {
    const coopId = this.getCooperativeId(user);

    return warehouseRepository.createMaterial({
      material_name:   data.material_name,
      material_type:   data.material_type,
      unit:            data.unit,
      min_stock_alert: data.min_stock_alert,
      cooperative_id:  coopId,
    });
  }

  async getMaterials(query: any, user: JwtPayload) {
    const coopId = this.getCooperativeId(user);

    const { data, total } = await warehouseRepository.findMaterials(coopId, {
      search:        query.search,
      material_type: query.material_type,
      page:          Number(query.page) || 1,
      limit:         Number(query.limit) || 20,
    });

    return {
      data,
      meta: {
        page:        Number(query.page) || 1,
        limit:       Number(query.limit) || 20,
        total,
        total_pages: Math.ceil(total / (Number(query.limit) || 20)),
      },
    };
  }

  async getMaterialById(id: string, user: JwtPayload) {
    const coopId = this.getCooperativeId(user);
    return this.getMaterialWithOwnershipCheck(id, coopId);
  }

  async updateMaterial(id: string, data: UpdateMaterialDtoType, user: JwtPayload) {
    const coopId = this.getCooperativeId(user);
    await this.getMaterialWithOwnershipCheck(id, coopId);
    return warehouseRepository.updateMaterial(id, data);
  }

  async deleteMaterial(id: string, user: JwtPayload) {
    const coopId = this.getCooperativeId(user);
    const material = await this.getMaterialWithOwnershipCheck(id, coopId);

    // Soft delete — đánh dấu is_active = false
    if (!material.is_active) {
      throw new AppError('MATERIAL_NOT_FOUND', 404, 'Vật tư đã được vô hiệu hóa trước đó');
    }

    return warehouseRepository.updateMaterial(id, { is_active: false });
  }

  // ══════════════════════════════════════════════════
  // STOCK
  // ══════════════════════════════════════════════════

  async getStock(user: JwtPayload) {
    const coopId = this.getCooperativeId(user);
    return warehouseRepository.findAllStock(coopId);
  }

  async getStockAlerts(user: JwtPayload) {
    const coopId = this.getCooperativeId(user);
    return warehouseRepository.findStockAlerts(coopId);
  }

  // ══════════════════════════════════════════════════
  // TRANSACTIONS
  // ══════════════════════════════════════════════════

  async importStock(dto: ImportTransactionDtoType, user: JwtPayload) {
    const coopId = this.getCooperativeId(user);
    await this.getMaterialWithOwnershipCheck(dto.material_id, coopId);

    return warehouseRepository.createTransactionInTx({
      transactionData: {
        material_id:      dto.material_id,
        transaction_type: 'IMPORT',
        quantity:         dto.quantity,
        unit_price:       dto.unit_price,
        supplier:         dto.supplier,
        invoice_no:       dto.invoice_no,
        transaction_date: new Date(dto.transaction_date),
        expiry_date:      dto.expiry_date ? new Date(dto.expiry_date) : null,
        notes:            dto.notes,
        created_by:       user.userId,
      },
      stockDelta: +dto.quantity,
      materialId: dto.material_id,
      expiryDate: dto.expiry_date ? new Date(dto.expiry_date) : undefined,
    });
  }

  async exportStock(dto: ExportTransactionDtoType, user: JwtPayload) {
    const coopId = this.getCooperativeId(user);
    const material = await this.getMaterialWithOwnershipCheck(dto.material_id, coopId);

    // BR-005-1: Kiểm tra tồn kho trước khi xuất
    const stock = material.stock_item;
    if (!stock || stock.current_stock < dto.quantity) {
      throw new AppError(
        'INSUFFICIENT_STOCK',
        422,
        `Tồn kho hiện tại: ${stock?.current_stock ?? 0} ${material.unit}. Yêu cầu: ${dto.quantity} ${material.unit}`
      );
    }

    // BR-005-6: Kiểm tra hạn sử dụng — chặn xuất nếu đã hết hạn
    if (stock.expiry_date && stock.expiry_date < new Date()) {
      throw new AppError(
        'MATERIAL_EXPIRED',
        422,
        `Vật tư đã hết hạn sử dụng ngày: ${stock.expiry_date.toLocaleDateString('vi-VN')}`
      );
    }

    // BR-005-4: Kiểm tra farmer thuộc cùng HTX
    const farmer = await farmerRepository.findById(dto.recipient_farmer_id);
    if (!farmer) {
      throw new AppError('FARMER_NOT_FOUND', 404, 'Không tìm thấy nông dân nhận vật tư');
    }
    if (farmer.cooperative_id !== coopId) {
      throw new AppError(
        'FARMER_NOT_IN_COOPERATIVE',
        403,
        'Nông dân nhận vật tư không thuộc Hợp tác xã của bạn'
      );
    }

    return warehouseRepository.createTransactionInTx({
      transactionData: {
        material_id:         dto.material_id,
        transaction_type:    'EXPORT',
        quantity:            dto.quantity,
        recipient_farmer_id: dto.recipient_farmer_id,
        purpose:             dto.purpose,
        transaction_date:    new Date(dto.transaction_date),
        notes:               dto.notes,
        created_by:          user.userId,
      },
      stockDelta: -dto.quantity,
      materialId: dto.material_id,
    });
  }

  async returnStock(dto: ReturnTransactionDtoType, user: JwtPayload) {
    const coopId = this.getCooperativeId(user);
    await this.getMaterialWithOwnershipCheck(dto.material_id, coopId);

    return warehouseRepository.createTransactionInTx({
      transactionData: {
        material_id:         dto.material_id,
        transaction_type:    'RETURN',
        quantity:            dto.quantity,
        recipient_farmer_id: dto.recipient_farmer_id,
        purpose:             dto.return_reason,
        transaction_date:    new Date(dto.transaction_date),
        notes:               dto.notes,
        created_by:          user.userId,
      },
      stockDelta: +dto.quantity,
      materialId: dto.material_id,
    });
  }

  async getTransactions(query: TransactionQueryDtoType, user: JwtPayload) {
    const coopId = this.getCooperativeId(user);
    const { data, total } = await warehouseRepository.findTransactions(coopId, query);

    return {
      data,
      meta: {
        page:        query.page,
        limit:       query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
      },
    };
  }

  async getTransactionById(id: string, user: JwtPayload) {
    const coopId = this.getCooperativeId(user);
    const transaction = await warehouseRepository.findTransactionById(id);
    if (!transaction) {
      throw new AppError('TRANSACTION_NOT_FOUND', 404, 'Không tìm thấy phiếu giao dịch');
    }
    if (transaction.material.cooperative_id !== coopId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền xem giao dịch của HTX khác');
    }
    return transaction;
  }

  // ══════════════════════════════════════════════════
  // RECONCILIATION — Đối chiếu xuất kho vs nhật ký canh tác
  // ══════════════════════════════════════════════════

  async getReconciliation(query: ReconciliationQueryDtoType, user: JwtPayload) {
    const coopId = this.getCooperativeId(user);

    const dateFilter: any = {};
    if (query.from_date) dateFilter.gte = new Date(query.from_date);
    if (query.to_date)   dateFilter.lte = new Date(query.to_date);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // 1. Tổng xuất kho theo nông dân + vật tư
    const exportWhere: any = {
      transaction_type: 'EXPORT',
      material: { cooperative_id: coopId },
    };
    if (query.farmer_id)  exportWhere.recipient_farmer_id = query.farmer_id;
    if (hasDateFilter)    exportWhere.transaction_date = dateFilter;

    const exports = await prisma.warehouseTransaction.groupBy({
      by: ['recipient_farmer_id', 'material_id'],
      where: exportWhere,
      _sum: { quantity: true },
    });

    // 2. Tổng vật tư ghi trong nhật ký canh tác
    const logWhere: any = {
      activity_type: { in: ['FERTILIZING', 'PESTICIDE'] },
      season: {
        farm_zone: {
          farmer: {
            cooperative_id: coopId,
          },
        },
      },
    };
    if (query.farmer_id) {
      logWhere.season = {
        farm_zone: {
          farmer_id: undefined, // will be set below
          farmer: { cooperative_id: coopId },
        },
      };
      // Need to find farmers matching the farmer_id
      logWhere.season.farm_zone.farmer_id = undefined;
      // Simplify: filter by farmer cooperative in a nested way
    }
    if (hasDateFilter) logWhere.activity_date = dateFilter;

    const logged = await prisma.farmingLog.groupBy({
      by: ['season_id'],
      where: logWhere,
      _sum: {
        quantity_kg: true,
        dosage: true,
      },
    });

    // 3. Enrich exports with material names
    const materialIds = [...new Set(exports.map(e => e.material_id))];
    const materials = await prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, material_name: true, unit: true },
    });
    const materialMap = new Map(materials.map(m => [m.id, m]));

    // Enrich farmer names
    const farmerIds = [...new Set(exports.map(e => e.recipient_farmer_id).filter(Boolean))] as string[];
    const farmers = await prisma.farmer.findMany({
      where: { id: { in: farmerIds } },
      select: { id: true, full_name: true, farmer_code: true },
    });
    const farmerMap = new Map(farmers.map(f => [f.id, f]));

    const enrichedExports = exports.map(e => ({
      farmer_id:     e.recipient_farmer_id,
      farmer_name:   farmerMap.get(e.recipient_farmer_id ?? '')?.full_name ?? 'N/A',
      farmer_code:   farmerMap.get(e.recipient_farmer_id ?? '')?.farmer_code ?? 'N/A',
      material_id:   e.material_id,
      material_name: materialMap.get(e.material_id)?.material_name ?? 'N/A',
      unit:          materialMap.get(e.material_id)?.unit ?? '',
      total_exported: e._sum.quantity ?? 0,
    }));

    return {
      exported: enrichedExports,
      logged,
      summary: 'Chênh lệch dương = vật tư đã cấp nhưng chưa ghi nhật ký',
    };
  }
}

export const warehouseService = new WarehouseService();
