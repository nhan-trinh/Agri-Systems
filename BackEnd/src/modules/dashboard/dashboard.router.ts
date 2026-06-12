import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Dashboard is accessible to SUPER_ADMIN, HTX_MANAGER, and GOV_VIEWER
router.use(requireAuth);
router.use(requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER, UserRole.GOV_VIEWER));

router.get('/stats', dashboardController.getStats);
router.get('/yield-chart', dashboardController.getYieldChart);
router.get('/carbon-chart', dashboardController.getCarbonChart);
router.get('/farm-zones', dashboardController.getFarmZones);
router.get('/recent-activities', dashboardController.getRecentActivities);
router.get('/action-items', dashboardController.getActionItems);

export default router;
