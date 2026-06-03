import { Request, Response, NextFunction } from 'express';
import { checkvnQrService } from './checkvn-qr.service';
import responseHelper from '../../shared/utils/response.helper';

export class CheckvnQrController {
  // Example endpoint
  public getHello = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const msg = await checkvnQrService.getHelloMessage();
      responseHelper.success(res, { message: msg });
    } catch (error) {
      next(error);
    }
  };
}

export const checkvnQrController = new CheckvnQrController();
