import { Request, Response, NextFunction } from 'express';
import { carbonRecordService } from './carbon.record.service';
import { carbonRepository } from './carbon.repository';
import responseHelper from '../../shared/utils/response.helper';
import { AppError } from '../../shared/utils/app-error';
import { CarbonStatus } from '@prisma/client';

export class CarbonController {
  // ==================== EMISSION FACTORS ====================

  public getAllFactors = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const factors = await carbonRecordService.getAllEmissionFactors();
      responseHelper.success(res, factors);
    } catch (error) {
      next(error);
    }
  };

  public getFactorById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const factor = await carbonRecordService.getEmissionFactorById(req.params.id);
      responseHelper.success(res, factor);
    } catch (error) {
      next(error);
    }
  };

  public createFactor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const factor = await carbonRecordService.createEmissionFactor(req.body);
      responseHelper.success(res, factor, 201);
    } catch (error) {
      next(error);
    }
  };

  public updateFactor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const factor = await carbonRecordService.updateEmissionFactor(req.params.id, req.body);
      responseHelper.success(res, factor);
    } catch (error) {
      next(error);
    }
  };

  public deleteFactor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const factor = await carbonRecordService.deleteEmissionFactor(req.params.id);
      responseHelper.success(res, factor);
    } catch (error) {
      next(error);
    }
  };

  // ==================== CARBON RECORDS ====================

  public getCarbonRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = req.query.status as CarbonStatus | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      const parsedPage = isNaN(page) || page <= 0 ? 1 : page;
      const parsedLimit = isNaN(limit) || limit <= 0 ? 10 : limit;

      const result = await carbonRecordService.getCarbonRecords(req.user!, status, parsedPage, parsedLimit);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  public getCarbonRecordById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await carbonRecordService.getCarbonRecordById(req.params.id, req.user!);
      responseHelper.success(res, record);
    } catch (error) {
      next(error);
    }
  };

  public verifyCarbonRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const record = await carbonRecordService.verifyCarbonRecord(req.params.id, req.user!);
      responseHelper.success(res, record);
    } catch (error) {
      next(error);
    }
  };

  public issueCarbonCredits = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await carbonRecordService.issueCarbonCredits(req.params.id, req.user!);
      responseHelper.success(res, result.record, 200);
    } catch (error) {
      next(error);
    }
  };

  public getCertificate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const exportJob = await carbonRecordService.triggerPdfGeneration(req.params.id, req.user!);
      // Returns 202 Accepted with ExportJob details for client polling
      responseHelper.success(res, exportJob, 202);
    } catch (error) {
      next(error);
    }
  };

  public getExportJobStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const job = await carbonRepository.findExportJobById(req.params.jobId);
      if (!job) {
        throw new AppError('EXPORT_JOB_NOT_FOUND', 404, 'Không tìm thấy tiến trình xuất chứng nhận');
      }
      responseHelper.success(res, job);
    } catch (error) {
      next(error);
    }
  };
}

export const carbonController = new CarbonController();
export default carbonController;
