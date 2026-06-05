import { Router } from 'express';
import { cooperativeController } from './cooperative.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../../shared/pipes/validate.pipe';
import { CreateCooperativeDto, UpdateCooperativeDto } from './cooperative.dto';
import { UserRole } from '@prisma/client';

const router = Router();

// Tất cả route liên quan đến Hợp tác xã yêu cầu đã đăng nhập và là SUPER_ADMIN
router.use(requireAuth);
router.use(requireRole(UserRole.SUPER_ADMIN));

router.get('/', cooperativeController.getAll);
router.get('/:id', cooperativeController.getById);
router.post('/', validateBody(CreateCooperativeDto), cooperativeController.create);
router.put('/:id', validateBody(UpdateCooperativeDto), cooperativeController.update);
router.delete('/:id', cooperativeController.delete);

export default router;
