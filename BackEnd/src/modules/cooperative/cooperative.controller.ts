import { Request, Response, NextFunction } from 'express';
import { cooperativeService } from './cooperative.service';
import responseHelper from '../../shared/utils/response.helper';

export class CooperativeController {
  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const coops = await cooperativeService.getAllCooperatives();
      responseHelper.success(res, coops);
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const coop = await cooperativeService.getCooperativeById(req.params.id);
      responseHelper.success(res, coop);
    } catch (error) {
      next(error);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const coop = await cooperativeService.createCooperative(req.body);
      responseHelper.success(res, coop, 201);
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const coop = await cooperativeService.updateCooperative(req.params.id, req.body);
      responseHelper.success(res, coop);
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const coop = await cooperativeService.deleteCooperative(req.params.id);
      responseHelper.success(res, coop);
    } catch (error) {
      next(error);
    }
  };
}

export const cooperativeController = new CooperativeController();
