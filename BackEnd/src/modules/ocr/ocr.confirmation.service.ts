import { ocrRepository } from './ocr.repository';
import { ocrAuditService } from './ocr.audit.service';
import { ocrValidationService } from './ocr.validation.service';
import { farmingLogService } from '../farming-log/farming-log.service';
import { warehouseService } from '../warehouse/warehouse.service';
import { AppError } from '../../shared/utils/app-error';
import { JwtPayload } from '../auth/auth.types';
import { OcrDraftStatus, OcrTargetEntity } from '@prisma/client';
import { ConfirmDraftResponse } from './ocr.types';

/**
 * OcrConfirmationService — converts a confirmed draft into an official
 * FarmingLog or WarehouseTransaction by delegating to the existing domain services.
 *
 * Per BR-007-3: OCR/AI never creates official records directly. Human confirmation does.
 */
export class OcrConfirmationService {
  /**
   * Confirm a draft: validate, call the domain service, then stamp the draft
   * as CONFIRMED with the official record id + audit diff.
   *
   * On validation/domain failure, the draft stays in its current state and the
   * error is surfaced to the reviewer (no data loss).
   */
  public async confirmDraft(
    draftId: string,
    user: JwtPayload,
    req?: { ip?: string; get: (header: string) => string | undefined },
  ): Promise<ConfirmDraftResponse> {
    const draft = await ocrRepository.findDraftById(draftId);
    if (!draft) {
      throw new AppError('OCR_DRAFT_NOT_FOUND', 404, 'Không tìm thấy bản nháp OCR tương ứng');
    }

    // RBAC: HTX_MANAGER may only confirm drafts in their own cooperative
    if (user.role === 'HTX_MANAGER' && draft.document?.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn chỉ được phép xác nhận tài liệu OCR thuộc hợp tác xã của mình');
    }

    if (draft.status === OcrDraftStatus.CONFIRMED && draft.official_record_id) {
      return {
        draft_id: draftId,
        status: 'CONFIRMED',
        official_record: {
          type: draft.target_entity === 'FARMING_LOG' ? 'FARMING_LOG' : 'WAREHOUSE_TRANSACTION',
          id: draft.official_record_id,
        },
      };
    }

    if (draft.status === OcrDraftStatus.CONFIRMED) {
      throw new AppError('OCR_DRAFT_ALREADY_CONFIRMED', 409, 'Bản nháp này đã được xác nhận');
    }

    // Use confirmed_data if the reviewer saved edits; otherwise fall back to ai_normalized_data
    const payload = (draft.confirmed_data ?? draft.ai_normalized_data) as Record<string, unknown>;

    if (draft.status === OcrDraftStatus.CONFIRMING) {
      throw new AppError('OCR_DRAFT_CONFIRMING', 409, 'Bản nháp này đang được xác nhận. Vui lòng chờ trong giây lát.');
    }

    const claimed = await ocrRepository.claimDraftForConfirmation(draftId);
    if (!claimed) {
      const latest = await ocrRepository.findDraftById(draftId);
      if (latest?.status === OcrDraftStatus.CONFIRMED && latest.official_record_id) {
        return {
          draft_id: draftId,
          status: 'CONFIRMED',
          official_record: {
            type: latest.target_entity === 'FARMING_LOG' ? 'FARMING_LOG' : 'WAREHOUSE_TRANSACTION',
            id: latest.official_record_id,
          },
        };
      }
      throw new AppError('OCR_DRAFT_CONFIRMING', 409, 'Bản nháp này đang được xác nhận. Vui lòng chờ trong giây lát.');
    }

    let officialId: string;
    let targetType: OcrTargetEntity;

    try {
      if (draft.target_entity === 'FARMING_LOG') {
        targetType = 'FARMING_LOG';
        officialId = await this.confirmFarmingLog(draft, payload, user);
      } else if (draft.target_entity === 'WAREHOUSE_TRANSACTION') {
        targetType = 'WAREHOUSE_TRANSACTION';
        officialId = await this.confirmWarehouseTransaction(draft, payload, user);
      } else {
        throw new AppError('OCR_UNKNOWN_TARGET', 400, 'Loại bản ghi đích không hợp lệ');
      }
    } catch (error) {
      await ocrRepository.releaseDraftConfirmation(draftId);
      throw error;
    }

    // Stamp draft CONFIRMED + stamp official record with OCR traceability fields
    await ocrRepository.markDraftConfirmed(
      draftId,
      officialId,
      user.userId,
      payload as never,
      targetType,
      draft.document_id,
    );

    // Audit log: diff between AI-normalized data and final confirmed data
    await ocrAuditService.log({
      document_id: draft.document_id,
      actor_user_id: user.userId,
      action: 'CONFIRM',
      before_data: draft.ai_normalized_data as Record<string, unknown> | null,
      after_data: payload,
      ip_address: req?.ip,
      user_agent: req?.get?.('user-agent'),
    });

    if (draft.document?.batch_id) {
      await ocrRepository.recomputeBatchStatus(draft.document.batch_id);
    }

    return {
      draft_id: draftId,
      status: 'CONFIRMED',
      official_record: {
        type: targetType === 'FARMING_LOG' ? 'FARMING_LOG' : 'WAREHOUSE_TRANSACTION',
        id: officialId,
      },
    };
  }

  /**
   * Create a FarmingLog via the existing service.
   * farmingLogService.createLog takes a raw Record<string, unknown> and applies its own
   * business rules (season ACTIVE check, date range, material ownership, etc.).
   */
  private async confirmFarmingLog(
    draft: { document_id: string },
    payload: Record<string, unknown>,
    user: JwtPayload,
  ): Promise<string> {
    // Pre-validate against the DTO so we can surface clean errors to the reviewer
    const { valid, errors } = await ocrValidationService.validateFarmingLogDraft(
      payload,
      user.cooperativeId,
    );
    if (!valid) {
      throw new AppError(
        'OCR_DRAFT_VALIDATION_FAILED',
        400,
        `Dữ liệu xác nhận không hợp lệ: ${errors.map(e => `${e.field}: ${e.message}`).join('; ')}`,
      );
    }

    const created = await farmingLogService.createLog(payload, user);
    return created.id;
  }

  /**
   * Create a WarehouseTransaction via the existing service.
   * transaction_type in the payload selects import vs export.
   */
  private async confirmWarehouseTransaction(
    draft: { document_id: string },
    payload: Record<string, unknown>,
    user: JwtPayload,
  ): Promise<string> {
    const transactionType = (payload.transaction_type as string | undefined)?.toUpperCase();

    if (transactionType === 'EXPORT') {
      const { valid, errors } = await ocrValidationService.validateWarehouseDraft(
        payload,
        user.cooperativeId,
        'EXPORT',
      );
      if (!valid) {
        throw new AppError(
          'OCR_DRAFT_VALIDATION_FAILED',
          400,
          `Dữ liệu xác nhận không hợp lệ: ${errors.map(e => `${e.field}: ${e.message}`).join('; ')}`,
        );
      }
      const created = await warehouseService.exportStock(payload as never, user);
      return created.transaction.id;
    }

    // Default to IMPORT
    const { valid, errors } = await ocrValidationService.validateWarehouseDraft(
      payload,
      user.cooperativeId,
      'IMPORT',
    );
    if (!valid) {
      throw new AppError(
        'OCR_DRAFT_VALIDATION_FAILED',
        400,
        `Dữ liệu xác nhận không hợp lệ: ${errors.map(e => `${e.field}: ${e.message}`).join('; ')}`,
      );
    }
    const created = await warehouseService.importStock(payload as never, user);
    return created.transaction.id;
  }
}

export const ocrConfirmationService = new OcrConfirmationService();
