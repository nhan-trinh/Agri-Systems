import { Router } from 'express';
import { carbonController } from './carbon.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../../shared/pipes/validate.pipe';
import { CreateEmissionFactorDto, UpdateEmissionFactorDto } from './carbon.dto';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply authentication to all routes
router.use(requireAuth);

// ==================== EMISSION FACTORS ====================
// Only SUPER_ADMIN can modify emission factors, but others can read them
router.get(
  '/emission-factors',
  carbonController.getAllFactors
);
router.get(
  '/emission-factors/:id',
  carbonController.getFactorById
);
router.post(
  '/emission-factors',
  requireRole(UserRole.SUPER_ADMIN),
  validateBody(CreateEmissionFactorDto),
  carbonController.createFactor
);
router.put(
  '/emission-factors/:id',
  requireRole(UserRole.SUPER_ADMIN),
  validateBody(UpdateEmissionFactorDto),
  carbonController.updateFactor
);
router.delete(
  '/emission-factors/:id',
  requireRole(UserRole.SUPER_ADMIN),
  carbonController.deleteFactor
);

// ==================== CARBON RECORDS ====================
router.get(
  '/records',
  requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER, UserRole.GOV_VIEWER),
  carbonController.getCarbonRecords
);
router.get(
  '/records/:id',
  requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER),
  carbonController.getCarbonRecordById
);
router.post(
  '/records/:id/verify',
  requireRole(UserRole.SUPER_ADMIN),
  carbonController.verifyCarbonRecord
);
router.post(
  '/records/:id/issue',
  requireRole(UserRole.SUPER_ADMIN),
  carbonController.issueCarbonCredits
);
router.get(
  '/records/:id/certificate',
  requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER),
  carbonController.getCertificate
);
router.get(
  '/export-jobs/:jobId',
  carbonController.getExportJobStatus
);

export default router;
