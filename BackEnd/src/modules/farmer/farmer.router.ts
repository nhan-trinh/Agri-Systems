import { Router } from 'express';
import { farmerController } from './farmer.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { validateBody, validateQuery } from '../../shared/pipes/validate.pipe';
import { CreateFarmerDto, FarmerQueryDto, UpdateFarmerDto } from './farmer.dto';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER, UserRole.GOV_VIEWER),
  validateQuery(FarmerQueryDto),
  farmerController.getAll
);

router.get(
  '/:id',
  requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER, UserRole.FARMER),
  farmerController.getById
);

router.post(
  '/',
  requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER),
  validateBody(CreateFarmerDto),
  farmerController.create
);

router.put(
  '/:id',
  requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER),
  validateBody(UpdateFarmerDto),
  farmerController.update
);

router.patch(
  '/:id/status',
  requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER),
  farmerController.toggleStatus
);

export default router;
