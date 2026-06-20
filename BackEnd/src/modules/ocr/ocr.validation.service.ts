import prisma from '../../prisma/client';
import { CreateFarmingLogDto } from '../farming-log/farming-log.dto';
import {
  ImportTransactionDto,
  ExportTransactionDto,
} from '../warehouse/warehouse.dto';
import { ValidationError } from './ocr.types';
import { SeasonStatus } from '@prisma/client';

/**
 * OcrValidationService — validates draft data against the real domain DTOs
 * and checks cooperative ownership of referenced materials/seasons.
 *
 * Produces a list of validation_errors that the review screen surfaces to the user
 * so they can fix issues before confirmation.
 */
export class OcrValidationService {
  /**
   * Validate a FarmingLog draft payload against CreateFarmingLogDto (Zod).
   * Optionally pre-check season existence/ownership/active status.
   */
  public async validateFarmingLogDraft(
    data: Record<string, unknown>,
    cooperativeId: string | null,
  ): Promise<{ valid: boolean; errors: ValidationError[] }> {
    const errors: ValidationError[] = [];

    // 1. Zod schema validation (same rules as the HTTP route)
    const result = CreateFarmingLogDto.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          field: issue.path.join('.') || '_',
          message: issue.message,
        });
      }
    }

    // 2. Cooperative-level pre-checks (only if basic shape is valid)
    if (result.success) {
      const season = await prisma.season.findUnique({
        where: { id: result.data.season_id },
        include: { farm_zone: { include: { farmer: true } } },
      });

      if (!season) {
        errors.push({ field: 'season_id', message: 'Không tìm thấy vụ mùa tương ứng' });
      } else {
        if (cooperativeId && season.farm_zone.farmer.cooperative_id !== cooperativeId) {
          errors.push({
            field: 'season_id',
            message: 'Vụ mùa không thuộc hợp tác xã của bạn',
          });
        }
        if (season.status !== SeasonStatus.ACTIVE) {
          errors.push({
            field: 'season_id',
            message: 'Vụ mùa không đang hoạt động — không thể ghi nhật ký',
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate a WarehouseTransaction IMPORT draft against ImportTransactionDto.
   * NOTE: material_id is resolved by the reviewer (not OCR) — we check it belongs to the coop.
   */
  public async validateWarehouseDraft(
    data: Record<string, unknown>,
    cooperativeId: string | null,
    transactionType: 'IMPORT' | 'EXPORT',
  ): Promise<{ valid: boolean; errors: ValidationError[] }> {
    const errors: ValidationError[] = [];
    const schema = transactionType === 'IMPORT' ? ImportTransactionDto : ExportTransactionDto;

    const result = schema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          field: issue.path.join('.') || '_',
          message: issue.message,
        });
      }
    }

    // Check material belongs to cooperative
    const materialId = data.material_id as string | undefined;
    if (materialId) {
      const material = await prisma.material.findUnique({ where: { id: materialId } });
      if (!material) {
        errors.push({ field: 'material_id', message: 'Không tìm thấy vật tư trong kho' });
      } else if (cooperativeId && material.cooperative_id !== cooperativeId) {
        errors.push({
          field: 'material_id',
          message: 'Vật tư không thuộc hợp tác xã của bạn',
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export const ocrValidationService = new OcrValidationService();
