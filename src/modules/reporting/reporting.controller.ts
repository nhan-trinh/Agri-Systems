import { Request, Response, NextFunction } from 'express';
import { reportingService } from './reporting.service';
import responseHelper from '../../shared/utils/response.helper';

export class ReportingController {
  // Example endpoint
  public getHello = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const msg = await reportingService.getHelloMessage();
      responseHelper.success(res, { message: msg });
    } catch (error) {
      next(error);
    }
  };
}

export const reportingController = new ReportingController();
