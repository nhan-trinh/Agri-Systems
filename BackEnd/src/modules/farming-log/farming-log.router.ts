import { Router } from 'express';
import { farmingLogController } from './farming-log.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../../shared/pipes/validate.pipe';
import { CreateFarmingLogDto, UpdateFarmingLogDto } from './farming-log.dto';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(requireAuth);
router.use(requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER));

router.get('/', farmingLogController.getAll);
router.get('/:id', farmingLogController.getById);
router.post('/', validateBody(CreateFarmingLogDto), farmingLogController.create);
router.put('/:id', validateBody(UpdateFarmingLogDto), farmingLogController.update);
router.delete('/:id', farmingLogController.delete);

export default router;
