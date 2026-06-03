import { Request, Response, NextFunction } from 'express';
import { notificationService } from './notification.service';
import responseHelper from '../../shared/utils/response.helper';

export class NotificationController {
  // Example endpoint
  public getHello = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const msg = await notificationService.getHelloMessage();
      responseHelper.success(res, { message: msg });
    } catch (error) {
      next(error);
    }
  };
}

export const notificationController = new NotificationController();
