import { Request, Response, NextFunction } from 'express';
import { warehouseService } from './warehouse.service';
import responseHelper from '../../shared/utils/response.helper';

// ─────────────────────────────────────────────────────
// Controller — chuyển đổi HTTP request ↔ Service layer
// ─────────────────────────────────────────────────────

export class WarehouseController {

  // ── Material ──────────────────────────────────

  public createMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const material = await warehouseService.createMaterial(req.body, req.user!);
      responseHelper.success(res, material, 201);
    } catch (error) {
      next(error);
    }
  };

  public getMaterials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await warehouseService.getMaterials(req.query, req.user!);
      responseHelper.paginate(res, result.data, result.meta);
    } catch (error) {
      next(error);
    }
  };

  public getMaterialById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const material = await warehouseService.getMaterialById(req.params.id, req.user!);
      responseHelper.success(res, material);
    } catch (error) {
      next(error);
    }
  };

  public updateMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const material = await warehouseService.updateMaterial(req.params.id, req.body, req.user!);
      responseHelper.success(res, material);
    } catch (error) {
      next(error);
    }
  };

  public deleteMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const material = await warehouseService.deleteMaterial(req.params.id, req.user!);
      responseHelper.success(res, material);
    } catch (error) {
      next(error);
    }
  };

  // ── Stock ─────────────────────────────────────

  public getStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stock = await warehouseService.getStock(req.user!);
      responseHelper.success(res, stock);
    } catch (error) {
      next(error);
    }
  };

  public getStockAlerts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const alerts = await warehouseService.getStockAlerts(req.user!);
      responseHelper.success(res, alerts);
    } catch (error) {
      next(error);
    }
  };

  // ── Transactions ──────────────────────────────

  public importStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await warehouseService.importStock(req.body, req.user!);
      responseHelper.success(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  public exportStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await warehouseService.exportStock(req.body, req.user!);
      responseHelper.success(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  public returnStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await warehouseService.returnStock(req.body, req.user!);
      responseHelper.success(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  public getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await warehouseService.getTransactions(req.query as any, req.user!);
      responseHelper.paginate(res, result.data, result.meta);
    } catch (error) {
      next(error);
    }
  };

  public getTransactionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const transaction = await warehouseService.getTransactionById(req.params.id, req.user!);
      responseHelper.success(res, transaction);
    } catch (error) {
      next(error);
    }
  };

  // ── Reconciliation ────────────────────────────

  public getReconciliation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await warehouseService.getReconciliation(req.query as any, req.user!);
      responseHelper.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}

export const warehouseController = new WarehouseController();
