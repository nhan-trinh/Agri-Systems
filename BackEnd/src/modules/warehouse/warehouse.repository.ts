import prisma from '../../prisma/client';
import { Prisma, MaterialType, TransactionType } from '@prisma/client';
import { AppError } from '../../shared/utils/app-error';
import { TransactionQueryDtoType } from './warehouse.dto';

// ─────────────────────────────────────────────────────
// Repository — chỉ chứa logic truy vấn DB, không chứa business logic
// ─────────────────────────────────────────────────────

export class WarehouseRepository {

  // ── Material CRUD ──────────────────────────────

  async createMaterial(data: Prisma.MaterialUncheckedCreateInput) {
    return prisma.material.create({
      data,
      include: { stock_item: true },
    });
  }

  async findMaterialById(id: string) {
    return prisma.material.findUnique({
      where: { id },
      include: { stock_item: true },
    });
  }

  async updateMaterial(id: string, data: Prisma.MaterialUpdateInput) {
    return prisma.material.update({
      where: { id },
      data,
      include: { stock_item: true },
    });
  }

  async findMaterials(cooperativeId: string, filters: {
    search?: string;
    material_type?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.MaterialWhereInput = {
      cooperative_id: cooperativeId,
      is_active: true,
      ...(filters.search && {
        material_name: { contains: filters.search, mode: 'insensitive' as const },
      }),
      ...(filters.material_type && {
        material_type: filters.material_type as MaterialType,
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.material.findMany({
        where,
        include: { stock_item: true },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.material.count({ where }),
    ]);

    return { data, total };
  }

  // ── Stock queries ──────────────────────────────

  async findAllStock(cooperativeId: string) {
    return prisma.material.findMany({
      where: {
        cooperative_id: cooperativeId,
        is_active: true,
      },
      include: { stock_item: true },
      orderBy: { material_name: 'asc' },
    });
  }

  async findStockAlerts(cooperativeId: string) {
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    // Query for low stock or near-expiry materials
    const materials = await prisma.material.findMany({
      where: {
        cooperative_id: cooperativeId,
        is_active: true,
      },
      include: { stock_item: true },
    });

    // Filter in application layer for reliable comparison
    return materials.filter((m) => {
      if (!m.stock_item) return false;
      const isLowStock = m.stock_item.current_stock <= m.min_stock_alert;
      const isNearExpiry = m.stock_item.expiry_date
        ? m.stock_item.expiry_date <= thirtyDaysLater
        : false;
      return isLowStock || isNearExpiry;
    });
  }

  // ── Transaction — atomic stock update ──────────

  async createTransactionInTx(data: {
    transactionData: Prisma.WarehouseTransactionUncheckedCreateInput;
    stockDelta: number;   // + nhập/hoàn, - xuất
    materialId: string;
    expiryDate?: Date;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Tạo phiếu giao dịch (bất biến — BR-005-5)
      const transaction = await tx.warehouseTransaction.create({
        data: data.transactionData,
        include: { material: true },
      });

      // 2. Cập nhật tồn kho (upsert — có thể chưa có StockItem)
      const updateData: Prisma.StockItemUpdateInput = {
        current_stock: { increment: data.stockDelta },
      };
      if (data.expiryDate) {
        updateData.expiry_date = data.expiryDate;
      }

      const stockItem = await tx.stockItem.upsert({
        where: { material_id: data.materialId },
        create: {
          material_id: data.materialId,
          current_stock: Math.max(0, data.stockDelta),
          expiry_date: data.expiryDate ?? null,
        },
        update: updateData,
      });

      // 3. Double-check: kiểm tra không âm sau khi cập nhật
      if (stockItem.current_stock < 0) {
        throw new AppError(
          'INSUFFICIENT_STOCK',
          422,
          'Số lượng tồn kho không đủ để thực hiện giao dịch xuất kho'
        );
      }

      return { transaction, stockItem };
    });
  }

  // ── Transaction history ────────────────────────

  async findTransactionById(id: string) {
    return prisma.warehouseTransaction.findUnique({
      where: { id },
      include: { material: true },
    });
  }

  async findTransactions(cooperativeId: string, filters: TransactionQueryDtoType) {
    const where: Prisma.WarehouseTransactionWhereInput = {
      material: { cooperative_id: cooperativeId },
      ...(filters.material_id && { material_id: filters.material_id }),
      ...(filters.transaction_type && {
        transaction_type: filters.transaction_type as TransactionType,
      }),
      ...(filters.farmer_id && { recipient_farmer_id: filters.farmer_id }),
    };

    // Handle date range filters correctly when both are present
    if (filters.from_date || filters.to_date) {
      where.transaction_date = {};
      if (filters.from_date) {
        where.transaction_date.gte = new Date(filters.from_date);
      }
      if (filters.to_date) {
        where.transaction_date.lte = new Date(filters.to_date);
      }
    }

    const [data, total] = await prisma.$transaction([
      prisma.warehouseTransaction.findMany({
        where,
        include: { material: true },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { transaction_date: 'desc' },
      }),
      prisma.warehouseTransaction.count({ where }),
    ]);

    return { data, total };
  }
}

export const warehouseRepository = new WarehouseRepository();
