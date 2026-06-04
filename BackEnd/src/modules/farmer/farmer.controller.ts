import { Request, Response, NextFunction } from 'express';
import { farmerService } from './farmer.service';
import responseHelper from '../../shared/utils/response.helper';

export class FarmerController {
  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmers = await farmerService.getAllFarmers(req.user);
      responseHelper.success(res, farmers);
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmer = await farmerService.getFarmerById(req.params.id, req.user);
      responseHelper.success(res, farmer);
    } catch (error) {
      next(error);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmer = await farmerService.createFarmer(req.body, req.user);
      responseHelper.success(res, farmer, 201);
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmer = await farmerService.updateFarmer(req.params.id, req.body, req.user);
      responseHelper.success(res, farmer);
    } catch (error) {
      next(error);
    }
  };

  public toggleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmer = await farmerService.toggleFarmerStatus(req.params.id, req.user);
      responseHelper.success(res, farmer);
    } catch (error) {
      next(error);
    }
  };
}

export const farmerController = new FarmerController();
