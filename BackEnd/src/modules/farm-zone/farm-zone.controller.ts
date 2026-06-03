import { Request, Response, NextFunction } from 'express';
import { farmZoneService } from './farm-zone.service';
import responseHelper from '../../shared/utils/response.helper';

export class FarmZoneController {
  // Example endpoint
  public getHello = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const msg = await farmZoneService.getHelloMessage();
      responseHelper.success(res, { message: msg });
    } catch (error) {
      next(error);
    }
  };
}

export const farmZoneController = new FarmZoneController();
