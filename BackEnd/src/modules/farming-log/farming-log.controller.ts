import { Request, Response, NextFunction } from 'express';
import { farmingLogService } from './farming-log.service';
import responseHelper from '../../shared/utils/response.helper';

export class FarmingLogController {
  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const seasonId = req.query.seasonId as string | undefined;
      const logs = await farmingLogService.getLogs(req.user!, seasonId);
      responseHelper.success(res, logs);
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const log = await farmingLogService.getLogById(req.params.id, req.user!);
      responseHelper.success(res, log);
    } catch (error) {
      next(error);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const log = await farmingLogService.createLog(req.body, req.user!);
      responseHelper.success(res, log, 201);
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const log = await farmingLogService.updateLog(req.params.id, req.body, req.user!);
      responseHelper.success(res, log);
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await farmingLogService.deleteLog(req.params.id, req.user!);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}

export const farmingLogController = new FarmingLogController();
