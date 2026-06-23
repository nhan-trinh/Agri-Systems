import { Router } from 'express';
import { userController } from './user.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { validateBody, validateQuery } from '../../shared/pipes/validate.pipe';
import { CreateManagerDto, UpdateStatusDto, ListUsersQueryDto } from './user.dto';
import { UserRole } from '@prisma/client';

const router = Router();

// All user routes require authentication.
// Both SUPER_ADMIN and HTX_MANAGER may call the GET routes.
// Write routes (create/lock/reset) enforce SUPER_ADMIN inside the service layer,
// so the same router handles both roles without duplicating route definitions.
router.use(requireAuth);
router.use(requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER));

router.get('/',                       validateQuery(ListUsersQueryDto), userController.list);
router.get('/:id',                    userController.getById);
router.post('/managers',              validateBody(CreateManagerDto),   userController.createManager);
router.patch('/:id/status',           validateBody(UpdateStatusDto),    userController.setStatus);
router.post('/:id/reset-password',    userController.resetPassword);

export default router;
