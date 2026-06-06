import { Router } from 'express';
import { warehouseController } from './warehouse.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { validateBody, validateQuery } from '../../shared/pipes/validate.pipe';
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  ImportTransactionDto,
  ExportTransactionDto,
  ReturnTransactionDto,
  TransactionQueryDto,
  ReconciliationQueryDto,
} from './warehouse.dto';
import { UserRole } from '@prisma/client';

const router = Router();

// Tất cả route yêu cầu xác thực
router.use(requireAuth);

// Phân quyền: HTX_MANAGER hoặc WAREHOUSE_KEEPER
const ALLOWED  = requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER, UserRole.WAREHOUSE_KEEPER);
const HTX_ONLY = requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER);

// ── Danh mục vật tư ─────────────────────────────
router.post(  '/materials',     HTX_ONLY, validateBody(CreateMaterialDto), warehouseController.createMaterial);
router.get(   '/materials',     ALLOWED,  warehouseController.getMaterials);
router.get(   '/materials/:id', ALLOWED,  warehouseController.getMaterialById);
router.put(   '/materials/:id', HTX_ONLY, validateBody(UpdateMaterialDto), warehouseController.updateMaterial);
router.delete('/materials/:id', HTX_ONLY, warehouseController.deleteMaterial);

// ── Tồn kho ─────────────────────────────────────
router.get('/stock',        ALLOWED, warehouseController.getStock);
router.get('/stock/alerts', ALLOWED, warehouseController.getStockAlerts);

// ── Giao dịch (mỗi loại có DTO riêng) ──────────
router.post('/transactions/import', ALLOWED, validateBody(ImportTransactionDto), warehouseController.importStock);
router.post('/transactions/export', ALLOWED, validateBody(ExportTransactionDto), warehouseController.exportStock);
router.post('/transactions/return', ALLOWED, validateBody(ReturnTransactionDto), warehouseController.returnStock);
router.get( '/transactions',        ALLOWED, validateQuery(TransactionQueryDto), warehouseController.getTransactions);
router.get( '/transactions/:id',    ALLOWED, warehouseController.getTransactionById);

// ── Đối chiếu ───────────────────────────────────
router.get('/reconciliation', HTX_ONLY, validateQuery(ReconciliationQueryDto), warehouseController.getReconciliation);

export default router;
