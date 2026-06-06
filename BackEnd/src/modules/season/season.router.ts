import { Router } from 'express';
import { seasonController } from './season.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../../shared/pipes/validate.pipe';
import { CreateSeasonDto, UpdateSeasonDto, CompleteSeasonDto } from './season.dto';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(requireAuth);
router.use(requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER));

router.get('/', seasonController.getAll);
router.get('/:id', seasonController.getById);
router.post('/', validateBody(CreateSeasonDto), seasonController.create);
router.put('/:id', validateBody(UpdateSeasonDto), seasonController.update);
router.patch('/:id/complete', validateBody(CompleteSeasonDto), seasonController.complete);
router.patch('/:id/cancel', seasonController.cancel);

export default router;
