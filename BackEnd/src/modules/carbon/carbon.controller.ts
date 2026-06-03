import { Request, Response, NextFunction } from 'express';
import { carbonService } from './carbon.service';
import responseHelper from '../../shared/utils/response.helper';

export class CarbonController {
  // Example endpoint
  public getHello = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const msg = await carbonService.getHelloMessage();
      responseHelper.success(res, { message: msg });
    } catch (error) {
      next(error);
    }
  };
}

export const carbonController = new CarbonController();
