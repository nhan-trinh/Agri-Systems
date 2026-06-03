import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import responseHelper from '../../shared/utils/response.helper';

export class AuthController {
  // Example endpoint
  public getHello = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const msg = await authService.getHelloMessage();
      responseHelper.success(res, { message: msg });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
