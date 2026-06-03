import { Request, Response, NextFunction } from 'express';
import { farmerService } from './farmer.service';
import responseHelper from '../../shared/utils/response.helper';

export class FarmerController {
  // Example endpoint
  public getHello = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const msg = await farmerService.getHelloMessage();
      responseHelper.success(res, { message: msg });
    } catch (error) {
      next(error);
    }
  };
}

export const farmerController = new FarmerController();
