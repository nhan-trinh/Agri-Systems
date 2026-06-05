import { Request, Response, NextFunction } from 'express';
import { farmZoneService } from './farm-zone.service';
import responseHelper from '../../shared/utils/response.helper';

export class FarmZoneController {
  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmerId = req.query.farmerId as string | undefined;
      const zones = await farmZoneService.getZones(req.user, farmerId);
      responseHelper.success(res, zones);
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const zone = await farmZoneService.getZoneById(req.params.id, req.user);
      responseHelper.success(res, zone);
    } catch (error) {
      next(error);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const zone = await farmZoneService.createZone(req.body, req.user);
      responseHelper.success(res, zone, 201);
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const zone = await farmZoneService.updateZone(req.params.id, req.body, req.user);
      responseHelper.success(res, zone);
    } catch (error) {
      next(error);
    }
  };

  public toggleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const zone = await farmZoneService.toggleZoneStatus(req.params.id, req.user);
      responseHelper.success(res, zone);
    } catch (error) {
      next(error);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await farmZoneService.deleteZone(req.params.id, req.user);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  public checkOverlap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { boundary, exclude_id } = req.body;
      const result = await farmZoneService.checkOverlapAndCalculate(boundary, exclude_id);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}

export const farmZoneController = new FarmZoneController();
