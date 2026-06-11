import { Request, Response, NextFunction } from 'express';
import { checkvnQrService } from './checkvn-qr.service';
import responseHelper from '../../shared/utils/response.helper';

export class CheckvnQrController {
  public createBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const batch = await checkvnQrService.createBatch(req.body, req.user!);
      responseHelper.success(res, batch, 201);
    } catch (error) {
      next(error);
    }
  };

  public getAllBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const batches = await checkvnQrService.getAllBatches(req.user!);
      responseHelper.success(res, batches, 200);
    } catch (error) {
      next(error);
    }
  };

  public getBatchById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const batch = await checkvnQrService.getBatchById(req.params.id, req.user!);
      responseHelper.success(res, batch, 200);
    } catch (error) {
      next(error);
    }
  };

  public requestQrCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await checkvnQrService.requestQrCode(req.params.id, req.user!);
      responseHelper.success(
        res,
        {
          message: 'Yêu cầu cấp QR đã được tiếp nhận và đang xử lý',
          checkvn_batch_id: result.checkvn_batch_id,
        },
        202
      );
    } catch (error) {
      next(error);
    }
  };

  public processWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const signature = req.headers['x-checkvn-signature'] as string || '';
      const result = await checkvnQrService.processWebhook(req.body, signature);
      responseHelper.success(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  public getBatchQrCodes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const qrCodes = await checkvnQrService.getBatchQrCodes(req.params.id, req.user!);
      responseHelper.success(res, qrCodes, 200);
    } catch (error) {
      next(error);
    }
  };

  public activateBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await checkvnQrService.activateBatch(req.params.id, req.body.activation_note, req.user!);
      responseHelper.success(res, { message: 'Kích hoạt lô hàng và các mã QR thành công' }, 200);
    } catch (error) {
      next(error);
    }
  };

  public recallBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await checkvnQrService.recallBatch(req.params.id, req.body.recall_reason, req.user!);
      responseHelper.success(res, { message: 'Thu hồi lô hàng và các mã QR thành công' }, 200);
    } catch (error) {
      next(error);
    }
  };

  public publicTrace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const traceData = await checkvnQrService.publicTrace(req.params.qrCode);
      responseHelper.success(res, traceData, 200);
    } catch (error) {
      next(error);
    }
  };
}

export const checkvnQrController = new CheckvnQrController();
