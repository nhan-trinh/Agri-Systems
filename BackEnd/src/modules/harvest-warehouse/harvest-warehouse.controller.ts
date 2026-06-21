import { Request, Response, NextFunction } from 'express';
import { harvestWarehouseService } from './harvest-warehouse.service';
import responseHelper from '../../shared/utils/response.helper';

// ─────────────────────────────────────────────────────
// Controller — chuyển đổi HTTP request ↔ Service layer.
// Structurally parallel to the Material Warehouse controller.
// ─────────────────────────────────────────────────────

export class HarvestWarehouseController {

  // ── RECEIVE / SHIP (mutations) ─────────────────

  public receive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await harvestWarehouseService.receive(req.body, req.user!);
      responseHelper.success(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  public ship = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await harvestWarehouseService.ship(req.body, req.user!);
      responseHelper.success(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  // ── STOCK & HISTORY (reads) ────────────────────

  public getStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stock = await harvestWarehouseService.getStock(req.user!);
      responseHelper.success(res, stock);
    } catch (error) {
      next(error);
    }
  };

  public getEntries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await harvestWarehouseService.getEntries(req.query as any, req.user!);
      responseHelper.paginate(res, result.data, result.meta);
    } catch (error) {
      next(error);
    }
  };

  public getEntryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entry = await harvestWarehouseService.getEntryById(req.params.id, req.user!);
      responseHelper.success(res, entry);
    } catch (error) {
      next(error);
    }
  };

  // ── RECONCILIATION (UC-07) ─────────────────────

  public getReconciliation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await harvestWarehouseService.getReconciliation(req.params.seasonId, req.user!);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  // ── QR LOOKUP (UC-01 fast path) ────────────────

  public qrLookup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await harvestWarehouseService.qrLookup(req.params.qrCode, req.user!);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}

export const harvestWarehouseController = new HarvestWarehouseController();
