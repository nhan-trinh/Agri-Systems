import { Request, Response, NextFunction } from 'express';
import { warehouseService } from './warehouse.service';
import responseHelper from '../../shared/utils/response.helper';

export class WarehouseController {
  // Example endpoint
  public getHello = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const msg = await warehouseService.getHelloMessage();
      responseHelper.success(res, { message: msg });
    } catch (error) {
      next(error);
    }
  };
}

export const warehouseController = new WarehouseController();
