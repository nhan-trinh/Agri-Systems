import { Router } from 'express';
import { farmerController } from './farmer.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../../shared/pipes/validate.pipe';
import { CreateFarmerDto, UpdateFarmerDto } from './farmer.dto';
import { UserRole } from '@prisma/client';

const router = Router();

// Tất cả các route liên quan đến Nông dân yêu cầu đăng nhập và có quyền SUPER_ADMIN hoặc HTX_MANAGER
router.use(requireAuth);
router.use(requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER));

router.get('/', farmerController.getAll);
router.get('/:id', farmerController.getById);
router.post('/', validateBody(CreateFarmerDto), farmerController.create);
router.put('/:id', validateBody(UpdateFarmerDto), farmerController.update);
router.patch('/:id/status', farmerController.toggleStatus);

export default router;

