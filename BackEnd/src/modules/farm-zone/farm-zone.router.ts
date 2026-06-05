import { Router } from 'express';
import { farmZoneController } from './farm-zone.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../../shared/pipes/validate.pipe';
import { CreateFarmZoneDto, UpdateFarmZoneDto, CheckOverlapDto } from './farm-zone.dto';
import { UserRole } from '@prisma/client';

const router = Router();

// All farm zone operations require authentication
router.use(requireAuth);

// Check overlap utility (can be called by managers when drawing on maps)
router.post('/check-overlap', requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER), validateBody(CheckOverlapDto), farmZoneController.checkOverlap);

// CRUD routes
router.get('/', requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER), farmZoneController.getAll);
router.get('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER), farmZoneController.getById);
router.post('/', requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER), validateBody(CreateFarmZoneDto), farmZoneController.create);
router.put('/:id', requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER), validateBody(UpdateFarmZoneDto), farmZoneController.update);
router.patch('/:id/status', requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER), farmZoneController.toggleStatus);
router.delete('/:id', requireRole(UserRole.SUPER_ADMIN), farmZoneController.delete); // Only super admin can soft-delete hard-link structures if needed

export default router;
