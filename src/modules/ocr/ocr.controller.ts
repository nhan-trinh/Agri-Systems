import { Request, Response, NextFunction } from 'express';
import { ocrService } from './ocr.service';
import responseHelper from '../../shared/utils/response.helper';

export class OcrController {
  // Example endpoint
  public getHello = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const msg = await ocrService.getHelloMessage();
      responseHelper.success(res, { message: msg });
    } catch (error) {
      next(error);
    }
  };
}

export const ocrController = new OcrController();
