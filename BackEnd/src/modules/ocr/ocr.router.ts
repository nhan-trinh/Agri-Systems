import { Router } from 'express';
import { ocrController } from './ocr.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { validateQuery } from '../../shared/pipes/validate.pipe';
import { ListOcrBatchesQueryDto } from './ocr.dto';
import { ocrUpload } from './ocr.upload';
import { UserRole } from '@prisma/client';

const router = Router();

// All OCR routes require authentication.
// Per spec §12 RBAC: HTX_MANAGER, WAREHOUSE_KEEPER, SUPER_ADMIN can review/confirm.
router.use(requireAuth);
router.use(requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER, UserRole.WAREHOUSE_KEEPER));

// Upload a batch of files for OCR processing (multipart/form-data) → 202 Accepted
router.post('/batches', ocrUpload.array('files', 10), ocrController.uploadBatch);

// List OCR batches (filtered by cooperative_id from JWT)
router.get('/batches', validateQuery(ListOcrBatchesQueryDto), ocrController.listBatches);

// Get document review data (original file preview + draft records)
router.get('/documents/:id/review', ocrController.getDocumentReview);

// Update a draft's confirmed_data before confirmation
router.patch('/draft-records/:id', ocrController.updateDraft);

// Confirm a draft → creates official FarmingLog or WarehouseTransaction
router.post('/draft-records/:id/confirm', ocrController.confirmDraft);

// Reject an unreadable document
router.post('/documents/:id/reject', ocrController.rejectDocument);

// Retry a failed document
router.post('/documents/:id/retry', ocrController.retryDocument);

export default router;
