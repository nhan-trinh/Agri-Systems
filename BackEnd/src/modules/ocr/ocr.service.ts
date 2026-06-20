import crypto from 'crypto';
import path from 'path';
import { ocrRepository } from './ocr.repository';
import { ocrAuditService } from './ocr.audit.service';
import { ocrValidationService } from './ocr.validation.service';
import StorageFactory from '../../shared/storage/storage.factory';
import { ocrDocumentQueue } from '../../shared/queues/ocr.queue';
import { AppError } from '../../shared/utils/app-error';
import { JwtPayload } from '../auth/auth.types';
import config from '../../config/app.config';
import { OcrBatchStatus, OcrDocumentStatus, OcrTargetEntity } from '@prisma/client';
import {
  UploadBatchResponse,
  DocumentReviewResponse,
} from './ocr.types';
import {
  UploadBatchFieldsDtoType,
  ListOcrBatchesQueryDtoType,
  UpdateDraftDtoType,
} from './ocr.dto';
import { Prisma } from '@prisma/client';

// ==================== CONSTANTS ====================

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

// ==================== SERVICE ====================

export class OcrService {
  // ── UPLOAD ─────────────────────────────────────────

  /**
   * Validate files, save originals to object storage, create OcrBatch + OcrDocument
   * records, enqueue processing jobs, and return 202-style response.
   */
  public async uploadBatch(
    files: Express.Multer.File[],
    fields: UploadBatchFieldsDtoType,
    user: JwtPayload,
  ): Promise<UploadBatchResponse> {
    // cooperative_id MUST come from JWT, never the request body (security)
    const cooperativeId = this.requireCooperativeId(user);

    if (!files || files.length === 0) {
      throw new AppError('NO_FILES_UPLOADED', 400, 'Vui lòng tải lên ít nhất một tệp');
    }

    if (files.length > config.ocr.maxFilesPerBatch) {
      throw new AppError(
        'TOO_MANY_FILES',
        400,
        `Số tệp tối đa mỗi lần tải lên là ${config.ocr.maxFilesPerBatch}`,
      );
    }

    // Validate each file (defense in depth — multer also checks)
    const maxBytes = config.ocr.maxFileSizeMb * 1024 * 1024;
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new AppError(
          'INVALID_FILE_TYPE',
          400,
          `Tệp "${file.originalname}" không đúng định dạng. Chỉ chấp nhận JPG, PNG, PDF.`,
        );
      }
      if (file.size > maxBytes) {
        throw new AppError(
          'FILE_TOO_LARGE',
          400,
          `Tệp "${file.originalname}" vượt quá giới hạn ${config.ocr.maxFileSizeMb}MB`,
        );
      }
    }

    const storage = StorageFactory.getStorageService();

    // Save each file to storage + compute SHA-256
    const savedFiles = await Promise.all(
      files.map(async (file) => {
        const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
        const safeName = this.sanitizeFilename(file.originalname);
        // object key: ocr/<coopId>/<batchTimestamp>/<filename>
        const objectKey = `ocr/${cooperativeId}/${Date.now()}-${safeName}`;
        await storage.saveFile(objectKey, file.buffer);

        return {
          original_filename: file.originalname,
          mime_type: file.mimetype,
          file_size_bytes: file.size,
          file_sha256: sha256,
          object_key: objectKey,
          hint: fields.document_hint,
        };
      }),
    );

    // Create batch + documents in a single transaction
    const batch = await ocrRepository.createBatchWithDocuments({
      cooperative_id: cooperativeId,
      uploaded_by: user.userId,
      documents: savedFiles.map(f => ({
        cooperative_id: cooperativeId,
        uploaded_by: user.userId,
        original_filename: f.original_filename,
        mime_type: f.mime_type,
        file_size_bytes: f.file_size_bytes,
        file_sha256: f.file_sha256,
        object_key: f.object_key,
      })),
    });

    // Enqueue a processing job for each document
    await Promise.all(
      batch.documents.map(doc =>
        ocrDocumentQueue.add('process', {
          document_id: doc.id,
          batch_id: batch.id,
          cooperative_id: cooperativeId,
          object_key: doc.object_key,
          hint: fields.document_hint,
          season_id: fields.season_id,
        }),
      ),
    );

    return {
      batch_id: batch.id,
      status: batch.status,
      documents: batch.documents.map(d => ({
        document_id: d.id,
        filename: d.original_filename,
        status: d.status,
      })),
    };
  }

  // ── LIST BATCHES ──────────────────────────────────

  public async listBatches(
    user: JwtPayload,
    query: ListOcrBatchesQueryDtoType,
  ): Promise<{ data: unknown[]; meta: { page: number; limit: number; total: number; total_pages: number } }> {
    const cooperativeId = this.requireCooperativeId(user);

    const { data, total } = await ocrRepository.findBatches({
      cooperativeId,
      status: query.status as OcrBatchStatus | undefined,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      data: data.map(b => ({
        batch_id: b.id,
        status: b.status,
        total_files: b.total_files,
        processed_files: b.processed_files,
        failed_files: b.failed_files,
        created_at: b.created_at,
        documents: b.documents.map(d => ({
          document_id: d.id,
          filename: d.original_filename,
          status: d.status,
          document_type: d.document_type,
        })),
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
      },
    };
  }

  // ── REVIEW ────────────────────────────────────────

  /**
   * Get a document with its drafts and a short-lived presigned preview URL.
   */
  public async getDocumentReview(
    documentId: string,
    user: JwtPayload,
  ): Promise<DocumentReviewResponse> {
    const doc = await ocrRepository.findDocumentById(documentId);
    if (!doc) {
      throw new AppError('OCR_DOCUMENT_NOT_FOUND', 404, 'Không tìm thấy tài liệu OCR tương ứng');
    }

    // RBAC: HTX_MANAGER may only review their own cooperative's documents
    if (user.role === 'HTX_MANAGER' && doc.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền xem tài liệu OCR này');
    }

    const storage = StorageFactory.getStorageService();
    const previewUrl = await storage.getPresignedDownloadUrl(doc.object_key);

    return {
      document: {
        id: doc.id,
        document_type: doc.document_type,
        status: doc.status,
        original_filename: doc.original_filename,
        mime_type: doc.mime_type,
        file_preview_url: previewUrl,
        raw_ocr_text: doc.raw_ocr_text,
        provider_name: doc.provider_name,
      },
      draft_records: doc.draft_records.map(d => ({
        id: d.id,
        target_entity: d.target_entity,
        status: d.status,
        ai_normalized_data: d.ai_normalized_data,
        confirmed_data: d.confirmed_data,
        validation_errors: d.validation_errors,
        confidence_score: d.confidence_score,
        official_record_id: d.official_record_id,
      })),
    };
  }

  // ── UPDATE DRAFT ──────────────────────────────────

  /**
   * Reviewer edits the draft's confirmed_data before confirming.
   * Re-runs validation so the review screen shows updated errors.
   */
  public async updateDraft(
    draftId: string,
    body: UpdateDraftDtoType,
    user: JwtPayload,
  ): Promise<{ draft_id: string; validation_errors: unknown }> {
    const draft = await ocrRepository.findDraftById(draftId);
    if (!draft) {
      throw new AppError('OCR_DRAFT_NOT_FOUND', 404, 'Không tìm thấy bản nháp OCR tương ứng');
    }

    if (user.role === 'HTX_MANAGER' && draft.document?.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền chỉnh sửa bản nháp này');
    }

    if (draft.status === 'CONFIRMED') {
      throw new AppError('OCR_DRAFT_ALREADY_CONFIRMED', 409, 'Không thể chỉnh sửa bản nháp đã xác nhận');
    }

    // Re-validate the confirmed payload against the target entity schema
    const payload = body.confirmed_data;
    let validationErrors: unknown = null;

    if (draft.target_entity === 'FARMING_LOG') {
      const { errors } = await ocrValidationService.validateFarmingLogDraft(payload, user.cooperativeId);
      if (errors.length > 0) validationErrors = errors;
    } else if (draft.target_entity === 'WAREHOUSE_TRANSACTION') {
      const txType = (payload.transaction_type as string | undefined)?.toUpperCase() === 'EXPORT'
        ? 'EXPORT' : 'IMPORT';
      const { errors } = await ocrValidationService.validateWarehouseDraft(payload, user.cooperativeId, txType);
      if (errors.length > 0) validationErrors = errors;
    }

    await ocrRepository.updateDraft(draftId, {
      confirmed_data: payload as Prisma.InputJsonValue,
      validation_errors: validationErrors as Prisma.InputJsonValue | null,
    });

    // Audit the edit
    await ocrAuditService.log({
      document_id: draft.document_id,
      actor_user_id: user.userId,
      action: 'EDIT_DRAFT',
      before_data: (draft.confirmed_data ?? draft.ai_normalized_data) as Record<string, unknown> | null,
      after_data: payload,
    });

    return { draft_id: draftId, validation_errors: validationErrors };
  }

  // ── REJECT ────────────────────────────────────────

  public async rejectDocument(
    documentId: string,
    reason: string,
    user: JwtPayload,
    req?: { ip?: string; get: (header: string) => string | undefined },
  ): Promise<{ document_id: string; status: string }> {
    const doc = await ocrRepository.findDocumentById(documentId);
    if (!doc) {
      throw new AppError('OCR_DOCUMENT_NOT_FOUND', 404, 'Không tìm thấy tài liệu OCR tương ứng');
    }

    if (user.role === 'HTX_MANAGER' && doc.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền từ chối tài liệu này');
    }

    if (doc.status === 'CONFIRMED') {
      throw new AppError('OCR_DOCUMENT_CONFIRMED', 409, 'Không thể từ chối tài liệu đã xác nhận');
    }

    await ocrRepository.rejectDocument(documentId, user.userId, reason);
    await ocrRepository.recomputeBatchStatus(doc.batch_id);

    await ocrAuditService.log({
      document_id: documentId,
      actor_user_id: user.userId,
      action: 'REJECT',
      after_data: { reason },
      ip_address: req?.ip,
      user_agent: req?.get?.('user-agent'),
    });

    return { document_id: documentId, status: OcrDocumentStatus.REJECTED };
  }

  // ── RETRY ─────────────────────────────────────────

  /**
   * Re-enqueue a failed document for processing.
   */
  public async retryDocument(
    documentId: string,
    user: JwtPayload,
  ): Promise<{ document_id: string; status: string }> {
    const doc = await ocrRepository.findDocumentById(documentId);
    if (!doc) {
      throw new AppError('OCR_DOCUMENT_NOT_FOUND', 404, 'Không tìm thấy tài liệu OCR tương ứng');
    }

    if (user.role === 'HTX_MANAGER' && doc.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền xử lý lại tài liệu này');
    }

    if (doc.status !== 'ERROR') {
      throw new AppError('OCR_DOCUMENT_NOT_FAILED', 409, 'Chỉ có thể xử lý lại tài liệu đang lỗi');
    }

    await ocrRepository.updateDocumentStatus(documentId, OcrDocumentStatus.QUEUED, {
      error_code: null,
      error_message: null,
    });

    await ocrDocumentQueue.add('process', {
      document_id: doc.id,
      batch_id: doc.batch_id,
      cooperative_id: doc.cooperative_id,
      object_key: doc.object_key,
    });

    await ocrAuditService.log({
      document_id: documentId,
      actor_user_id: user.userId,
      action: 'RETRY',
    });

    return { document_id: documentId, status: OcrDocumentStatus.QUEUED };
  }

  // ── HELPERS ───────────────────────────────────────

  /**
   * Extract cooperative_id from the JWT. Warehouse-style: requires non-null.
   * SUPER_ADMIN without a cooperative cannot upload OCR batches (no coop context).
   */
  private requireCooperativeId(user: JwtPayload): string {
    if (!user.cooperativeId) {
      throw new AppError(
        'FORBIDDEN',
        403,
        'Tài khoản của bạn không thuộc hợp tác xã nào. Không thể tải lên tài liệu OCR.',
      );
    }
    return user.cooperativeId;
  }

  private sanitizeFilename(filename: string): string {
    // Strip path separators + collapse to a safe filename
    const base = path.basename(filename);
    return base.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}

export const ocrService = new OcrService();
