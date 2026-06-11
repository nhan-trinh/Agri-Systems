import { Router } from 'express';
import { checkvnQrController } from './checkvn-qr.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../../shared/pipes/validate.pipe';
import { CreateBatchDto, ActivateBatchDto, RecallBatchDto, WebhookQrDto } from './checkvn-qr.dto';
import { UserRole } from '@prisma/client';

const router = Router();

// HTX_MANAGER
router.post(
  '/batches',
  requireAuth,
  requireRole(UserRole.HTX_MANAGER),
  validateBody(CreateBatchDto),
  checkvnQrController.createBatch
);

router.post(
  '/batches/:id/request',
  requireAuth,
  requireRole(UserRole.HTX_MANAGER),
  checkvnQrController.requestQrCode
);

router.get(
  '/batches/:id/qr-codes',
  requireAuth,
  requireRole(UserRole.HTX_MANAGER),
  checkvnQrController.getBatchQrCodes
);

router.post(
  '/batches/:id/activate',
  requireAuth,
  requireRole(UserRole.HTX_MANAGER),
  validateBody(ActivateBatchDto),
  checkvnQrController.activateBatch
);

// SUPER_ADMIN, HTX_MANAGER
router.get(
  '/batches',
  requireAuth,
  requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER),
  checkvnQrController.getAllBatches
);

router.get(
  '/batches/:id',
  requireAuth,
  requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER),
  checkvnQrController.getBatchById
);

router.post(
  '/batches/:id/recall',
  requireAuth,
  requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER),
  validateBody(RecallBatchDto),
  checkvnQrController.recallBatch
);

// PUBLIC
router.post(
  '/webhook',
  validateBody(WebhookQrDto),
  checkvnQrController.processWebhook
);

router.get(
  '/trace/:qrCode',
  checkvnQrController.publicTrace
);

export default router;
