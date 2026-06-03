import { Request, Response, NextFunction } from 'express';
import { farmingLogService } from './farming-log.service';
import responseHelper from '../../shared/utils/response.helper';

export class FarmingLogController {
  // Example endpoint
  public getHello = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const msg = await farmingLogService.getHelloMessage();
      responseHelper.success(res, { message: msg });
    } catch (error) {
      next(error);
    }
  };
}

export const farmingLogController = new FarmingLogController();
