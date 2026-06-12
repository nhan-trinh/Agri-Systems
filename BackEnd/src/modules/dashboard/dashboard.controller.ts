import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';
import responseHelper from '../../shared/utils/response.helper';

export class DashboardController {
  public getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetCooperativeId = req.query.cooperativeId as string | undefined;
      const stats = await dashboardService.getStats(req.user!, targetCooperativeId);
      responseHelper.success(res, stats);
    } catch (error) {
      next(error);
    }
  };

  public getYieldChart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const year = parseInt(req.query.year as string || new Date().getFullYear().toString(), 10);
      const targetCooperativeId = req.query.cooperativeId as string | undefined;
      const data = await dashboardService.getYieldChart(req.user!, year, targetCooperativeId);
      responseHelper.success(res, data);
    } catch (error) {
      next(error);
    }
  };

  public getCarbonChart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const year = parseInt(req.query.year as string || new Date().getFullYear().toString(), 10);
      const targetCooperativeId = req.query.cooperativeId as string | undefined;
      const data = await dashboardService.getCarbonChart(req.user!, year, targetCooperativeId);
      responseHelper.success(res, data);
    } catch (error) {
      next(error);
    }
  };

  public getFarmZones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetCooperativeId = req.query.cooperativeId as string | undefined;
      const data = await dashboardService.getFarmZones(req.user!, targetCooperativeId);
      responseHelper.success(res, data);
    } catch (error) {
      next(error);
    }
  };

  public getRecentActivities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetCooperativeId = req.query.cooperativeId as string | undefined;
      const data = await dashboardService.getRecentActivities(req.user!, targetCooperativeId);
      responseHelper.success(res, data);
    } catch (error) {
      next(error);
    }
  };

  public getActionItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const targetCooperativeId = req.query.cooperativeId as string | undefined;
      const data = await dashboardService.getActionItems(req.user!, targetCooperativeId);
      responseHelper.success(res, data);
    } catch (error) {
      next(error);
    }
  };
}

export const dashboardController = new DashboardController();
export default dashboardController;
