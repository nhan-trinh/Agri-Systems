import { Router } from 'express';
import { carbonController } from './carbon.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../../shared/pipes/validate.pipe';
import { CreateEmissionFactorDto, UpdateEmissionFactorDto } from './carbon.dto';
import { UserRole } from '@prisma/client';

const router = Router();

// Tất cả các route liên quan đến Cấu hình Carbon yêu cầu đăng nhập và có quyền SUPER_ADMIN
router.use(requireAuth);
router.use(requireRole(UserRole.SUPER_ADMIN));

router.get('/emission-factors', carbonController.getAll);
router.get('/emission-factors/:id', carbonController.getById);
router.post('/emission-factors', validateBody(CreateEmissionFactorDto), carbonController.create);
router.put('/emission-factors/:id', validateBody(UpdateEmissionFactorDto), carbonController.update);
router.delete('/emission-factors/:id', carbonController.delete);

export default router;
