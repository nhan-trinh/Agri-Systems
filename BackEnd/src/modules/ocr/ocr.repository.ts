import prisma from '../../prisma/client';
import {
  OcrBatchStatus,
  OcrDocumentStatus,
  OcrDocumentType,
  OcrDraftStatus,
  OcrTargetEntity,
  Prisma,
} from '@prisma/client';
import { OcrBatchWithDocuments, OcrDocumentWithDrafts } from './ocr.types';

// ==================== INCLUDE SHAPES ====================

const batchWithDocuments = Prisma.validator<Prisma.OcrBatchDefaultArgs>()({
  include: {
    documents: {
      include: { draft_records: true },
    },
  },
});

const documentWithDrafts = Prisma.validator<Prisma.OcrDocumentDefaultArgs>()({
  include: {
    batch: true,
    draft_records: true,
  },
});

// ==================== INPUT TYPES ====================

export interface CreateDocumentInput {
  cooperative_id: string;
  uploaded_by: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  file_sha256?: string;
  object_key: string;
}

export interface CreateDraftInput {
  document_id: string;
  target_entity: OcrTargetEntity;
  raw_extracted_data: Prisma.InputJsonValue;
  ai_normalized_data: Prisma.InputJsonValue;
  confidence_score?: number;
  validation_errors?: Prisma.InputJsonValue;
}

export interface BatchListFilters {
  cooperativeId: string;
  status?: OcrBatchStatus;
  skip: number;
  take: number;
}

// ==================== REPOSITORY ====================

export class OcrRepository {
  // ── BATCH ──────────────────────────────────────────

  /**
   * Create a batch and all its documents in a single transaction.
   * Returns the batch with nested documents.
   */
  public async createBatchWithDocuments(params: {
    cooperative_id: string;
    uploaded_by: string;
    documents: CreateDocumentInput[];
  }): Promise<OcrBatchWithDocuments> {
    return prisma.ocrBatch.create({
      data: {
        cooperative_id: params.cooperative_id,
        uploaded_by: params.uploaded_by,
        total_files: params.documents.length,
        status: OcrBatchStatus.QUEUED,
        documents: {
          create: params.documents.map(d => ({
            cooperative_id: d.cooperative_id,
            uploaded_by: d.uploaded_by,
            original_filename: d.original_filename,
            mime_type: d.mime_type,
            file_size_bytes: d.file_size_bytes,
            file_sha256: d.file_sha256 || null,
            object_key: d.object_key,
            status: OcrDocumentStatus.QUEUED,
          })),
        },
      },
      include: batchWithDocuments.include,
    });
  }

  public async findBatches(
    filters: BatchListFilters,
  ): Promise<{ data: OcrBatchWithDocuments[]; total: number }> {
    const where: Prisma.OcrBatchWhereInput = {
      cooperative_id: filters.cooperativeId,
    };
    if (filters.status) {
      where.status = filters.status;
    }

    const [data, total] = await Promise.all([
      prisma.ocrBatch.findMany({
        where,
        include: batchWithDocuments.include,
        orderBy: { created_at: 'desc' },
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.ocrBatch.count({ where }),
    ]);

    return { data, total };
  }

  public async findBatchById(id: string): Promise<OcrBatchWithDocuments | null> {
    return prisma.ocrBatch.findUnique({
      where: { id },
      include: batchWithDocuments.include,
    });
  }

  public async updateBatchStatus(id: string, status: OcrBatchStatus): Promise<void> {
    await prisma.ocrBatch.update({ where: { id }, data: { status } });
  }

  /**
   * Recompute batch progress (processed/failed counts) and derive status from child documents.
   * Called by the worker after each document finishes.
   */
  public async recomputeBatchStatus(batchId: string): Promise<OcrBatchStatus> {
    const docs = await prisma.ocrDocument.findMany({
      where: { batch_id: batchId },
      select: { status: true },
    });

    const total = docs.length;
    const processed = docs.filter(d =>
      ['AWAITING_REVIEW', 'CONFIRMED', 'REJECTED'].includes(d.status),
    ).length;
    const failed = docs.filter(d => d.status === 'ERROR').length;

    const confirmed = docs.filter(d => d.status === OcrDocumentStatus.CONFIRMED).length;

    let status: OcrBatchStatus;
    if (total > 0 && confirmed === total) {
      status = OcrBatchStatus.CONFIRMED;
    } else if (failed === total) {
      status = OcrBatchStatus.ERROR;
    } else if (failed > 0) {
      status = OcrBatchStatus.PARTIALLY_FAILED;
    } else if (processed === total) {
      status = OcrBatchStatus.AWAITING_REVIEW;
    } else if (processed > 0) {
      status = OcrBatchStatus.PROCESSING;
    } else {
      status = OcrBatchStatus.QUEUED;
    }

    await prisma.ocrBatch.update({
      where: { id: batchId },
      data: { status, processed_files: processed, failed_files: failed },
    });

    return status;
  }

  // ── DOCUMENT ───────────────────────────────────────

  public async findDocumentById(id: string): Promise<OcrDocumentWithDrafts | null> {
    return prisma.ocrDocument.findUnique({
      where: { id },
      include: documentWithDrafts.include,
    });
  }

  public async updateDocumentStatus(
    id: string,
    status: OcrDocumentStatus,
    extra?: { error_code?: string | null; error_message?: string | null },
  ): Promise<void> {
    await prisma.ocrDocument.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  public async markDocumentEnqueueFailed(
    id: string,
    message: string,
  ): Promise<void> {
    await prisma.ocrDocument.update({
      where: { id },
      data: {
        status: OcrDocumentStatus.ERROR,
        error_code: 'QUEUE_ENQUEUE_FAILED',
        error_message: message,
      },
    });
  }

  public async saveOcrResult(params: {
    documentId: string;
    documentType: OcrDocumentType;
    rawOcrText: string;
    rawOcrData: Prisma.InputJsonValue;
    providerName: string;
    providerMetadata?: Prisma.InputJsonValue;
    pageCount?: number;
    drafts: CreateDraftInput[];
  }): Promise<void> {
    const { documentId, documentType, rawOcrText, rawOcrData, providerName, providerMetadata, pageCount, drafts } = params;

    await prisma.$transaction([
      prisma.ocrDocument.update({
        where: { id: documentId },
        data: {
          document_type: documentType,
          status: OcrDocumentStatus.AWAITING_REVIEW,
          raw_ocr_text: rawOcrText,
          raw_ocr_data: rawOcrData,
          provider_name: providerName,
          provider_metadata: providerMetadata ?? Prisma.JsonNull,
          page_count: pageCount ?? null,
        },
      }),
      prisma.ocrDraftRecord.createMany({
        data: drafts.map(d => ({
          document_id: d.document_id,
          target_entity: d.target_entity,
          status: OcrDraftStatus.DRAFT,
          raw_extracted_data: d.raw_extracted_data,
          ai_normalized_data: d.ai_normalized_data,
          confidence_score: d.confidence_score ?? null,
          validation_errors: d.validation_errors ?? Prisma.JsonNull,
        })),
      }),
    ]);
  }

  /**
   * Reject a document and all its drafts in one transaction.
   */
  public async rejectDocument(
    documentId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<void> {
    await prisma.$transaction([
      prisma.ocrDocument.update({
        where: { id: documentId },
        data: { status: OcrDocumentStatus.REJECTED },
      }),
      prisma.ocrDraftRecord.updateMany({
        where: { document_id: documentId, status: OcrDraftStatus.DRAFT },
        data: {
          status: OcrDraftStatus.REJECTED,
          rejected_by: rejectedBy,
          rejected_at: new Date(),
          rejection_reason: reason,
        },
      }),
    ]);
  }

  // ── DRAFT ──────────────────────────────────────────

  public async findDraftById(id: string) {
    return prisma.ocrDraftRecord.findUnique({
      where: { id },
      include: { document: true },
    });
  }

  public async updateDraft(
    id: string,
    data: {
      confirmed_data?: Prisma.InputJsonValue;
      validation_errors?: Prisma.InputJsonValue | null;
    },
  ) {
    // Prisma JSON columns require Prisma.JsonNull sentinel, not a JS null.
    return prisma.ocrDraftRecord.update({
      where: { id },
      data: {
        confirmed_data: data.confirmed_data,
        validation_errors: data.validation_errors === null || data.validation_errors === undefined
          ? Prisma.JsonNull
          : data.validation_errors,
      },
    });
  }

  public async claimDraftForConfirmation(id: string): Promise<boolean> {
    const result = await prisma.ocrDraftRecord.updateMany({
      where: { id, status: OcrDraftStatus.DRAFT },
      data: { status: OcrDraftStatus.CONFIRMING },
    });

    return result.count === 1;
  }

  public async releaseDraftConfirmation(id: string): Promise<void> {
    await prisma.ocrDraftRecord.updateMany({
      where: { id, status: OcrDraftStatus.CONFIRMING },
      data: { status: OcrDraftStatus.DRAFT },
    });
  }

  public async markDraftConfirmed(
    draftId: string,
    officialRecordId: string,
    confirmedBy: string,
    confirmedData: Prisma.InputJsonValue,
    targetEntity: OcrTargetEntity,
    documentId: string,
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.ocrDraftRecord.update({
        where: { id: draftId },
        data: {
          status: OcrDraftStatus.CONFIRMED,
          official_record_id: officialRecordId,
          confirmed_by: confirmedBy,
          confirmed_at: new Date(),
          confirmed_data: confirmedData,
        },
      });

      // Stamp the official record with OCR traceability.
      // ocr_source_document_id is optional (String?), so use undefined when absent.
      if (targetEntity === 'FARMING_LOG') {
        await tx.farmingLog.updateMany({
          where: { id: officialRecordId },
          data: {
            ocr_draft_record_id: draftId,
            ocr_source_document_id: documentId || undefined,
          },
        });
      } else {
        await tx.warehouseTransaction.updateMany({
          where: { id: officialRecordId },
          data: {
            ocr_draft_record_id: draftId,
            ocr_source_document_id: documentId || undefined,
          },
        });
      }

      const remainingOpenDrafts = await tx.ocrDraftRecord.count({
        where: {
          document_id: documentId,
          status: { in: [OcrDraftStatus.DRAFT, OcrDraftStatus.CONFIRMING] },
        },
      });

      if (remainingOpenDrafts === 0) {
        await tx.ocrDocument.update({
          where: { id: documentId },
          data: { status: OcrDocumentStatus.CONFIRMED },
        });
      }
    });
  }

  // ── AUDIT ──────────────────────────────────────────

  public async createAuditLog(params: {
    document_id: string;
    actor_user_id: string;
    action: string;
    before_data?: Prisma.InputJsonValue;
    after_data?: Prisma.InputJsonValue;
    diff?: Prisma.InputJsonValue;
    ip_address?: string;
    user_agent?: string;
  }): Promise<void> {
    await prisma.ocrAuditLog.create({ data: params });
  }
}

export const ocrRepository = new OcrRepository();
