import { Request, Response, NextFunction } from 'express';
import { seasonService } from './season.service';
import responseHelper from '../../shared/utils/response.helper';
import { SeasonStatus } from '@prisma/client';

export class SeasonController {
  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmZoneId = req.query.farmZoneId as string | undefined;
      const status = req.query.status as SeasonStatus | undefined;
      
      const seasons = await seasonService.getSeasons(req.user!, farmZoneId, status);
      responseHelper.success(res, seasons);
    } catch (error) {
      next(error);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const season = await seasonService.getSeasonById(req.params.id, req.user!);
      responseHelper.success(res, season);
    } catch (error) {
      next(error);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const season = await seasonService.createSeason(req.body, req.user!);
      responseHelper.success(res, season, 201);
    } catch (error) {
      next(error);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const season = await seasonService.updateSeason(req.params.id, req.body, req.user!);
      responseHelper.success(res, season);
    } catch (error) {
      next(error);
    }
  };

  public complete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const season = await seasonService.completeSeason(req.params.id, req.body, req.user!);
      responseHelper.success(res, season);
    } catch (error) {
      next(error);
    }
  };

  public cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const season = await seasonService.cancelSeason(req.params.id, req.user!);
      responseHelper.success(res, season);
    } catch (error) {
      next(error);
    }
  };
}

export const seasonController = new SeasonController();
