import { Request, Response, NextFunction } from 'express';
import { ocrService } from './ocr.service';
import { ocrConfirmationService } from './ocr.confirmation.service';
import responseHelper from '../../shared/utils/response.helper';
import {
  UploadBatchFieldsDto,
  ListOcrBatchesQueryDto,
  UpdateDraftDto,
  RejectDocumentDto,
} from './ocr.dto';

export class OcrController {
  // ── POST /batches (multipart/form-data) ──────────
  public uploadBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const fields = UploadBatchFieldsDto.parse(req.body);
      const result = await ocrService.uploadBatch(files || [], fields, req.user!);
      responseHelper.success(res, result, 202);
    } catch (error) {
      next(error);
    }
  };

  // ── GET /batches ──────────────────────────────────
  public listBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = ListOcrBatchesQueryDto.parse(req.query);
      const result = await ocrService.listBatches(req.user!, query);
      responseHelper.paginate(res, result.data as never[], result.meta);
    } catch (error) {
      next(error);
    }
  };

  // ── GET /documents/:id/review ─────────────────────
  public getDocumentReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await ocrService.getDocumentReview(req.params.id, req.user!);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  // ── PATCH /draft-records/:id ──────────────────────
  public updateDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = UpdateDraftDto.parse(req.body);
      const result = await ocrService.updateDraft(req.params.id, body, req.user!);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  // ── POST /draft-records/:id/confirm ───────────────
  public confirmDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await ocrConfirmationService.confirmDraft(req.params.id, req.user!, req);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  // ── POST /documents/:id/reject ────────────────────
  public rejectDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = RejectDocumentDto.parse(req.body);
      const result = await ocrService.rejectDocument(req.params.id, body.reason, req.user!, req);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  // ── POST /documents/:id/retry ─────────────────────
  public retryDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await ocrService.retryDocument(req.params.id, req.user!);
      responseHelper.success(res, result, 202);
    } catch (error) {
      next(error);
    }
  };
}

export const ocrController = new OcrController();
