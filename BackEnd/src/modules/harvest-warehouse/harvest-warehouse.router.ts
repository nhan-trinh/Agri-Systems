import { Router } from 'express';
import { harvestWarehouseController } from './harvest-warehouse.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { validateBody, validateQuery } from '../../shared/pipes/validate.pipe';
import { ReceiveEntryDto, ShipEntryDto, EntryQueryDto } from './harvest-warehouse.dto';
import { UserRole } from '@prisma/client';

const router = Router();

// Tất cả route yêu cầu xác thực (NFR-04)
router.use(requireAuth);

// Phân quyền: WAREHOUSE_KEEPER + HTX_MANAGER cho nhận/xuất; HTX cho reconciliation.
// FARMER không có quyền ghi trong module này (UC §11).
const ALLOWED  = requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER, UserRole.WAREHOUSE_KEEPER);
const HTX_ONLY = requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER);

// ── Nhận / Xuất nông sản ─────────────────────────
router.post('/receive', ALLOWED, validateBody(ReceiveEntryDto), harvestWarehouseController.receive);
router.post('/ship',    ALLOWED, validateBody(ShipEntryDto),    harvestWarehouseController.ship);

// ── Tồn kho & lịch sử giao dịch ──────────────────
router.get('/stock',          ALLOWED, harvestWarehouseController.getStock);
router.get('/entries',        ALLOWED, validateQuery(EntryQueryDto), harvestWarehouseController.getEntries);
router.get('/entries/:id',    ALLOWED, harvestWarehouseController.getEntryById);

// ── Đối chiếu sản lượng (UC-07) ──────────────────
router.get('/reconciliation/:seasonId', HTX_ONLY, harvestWarehouseController.getReconciliation);

// ── QR lookup cho check-in nhanh (UC-01) ─────────
router.get('/qr-lookup/:qrCode', ALLOWED, harvestWarehouseController.qrLookup);

export default router;
