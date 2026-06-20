import {
  OcrBatch,
  OcrDocument,
  OcrDraftRecord,
  OcrAuditLog,
  Prisma,
} from '@prisma/client';

// ==================== PRISMA PAYLOAD TYPES ====================
// Define include shapes once so repository + service share types (matches farm-zone pattern).

const ocrBatchWithDocuments = {
  documents: {
    include: {
      draft_records: true,
    },
  },
} satisfies Prisma.OcrBatchInclude;

export type OcrBatchWithDocuments = Prisma.OcrBatchGetPayload<{
  include: typeof ocrBatchWithDocuments;
}>;

const ocrDocumentWithDrafts = {
  batch: true,
  draft_records: true,
} satisfies Prisma.OcrDocumentInclude;

export type OcrDocumentWithDrafts = Prisma.OcrDocumentGetPayload<{
  include: typeof ocrDocumentWithDrafts;
}>;

export type OcrDraftWithDocument = OcrDraftRecord & {
  document?: OcrDocument;
};

// ==================== SERVICE INPUT/OUTPUT TYPES ====================

export interface CreateOcrBatchInput {
  cooperative_id: string;
  uploaded_by: string;
  documents: Array<{
    original_filename: string;
    mime_type: string;
    file_size_bytes: number;
    file_sha256: string;
    object_key: string;
  }>;
}

export interface UploadBatchResponse {
  batch_id: string;
  status: string;
  documents: Array<{
    document_id: string;
    filename: string;
    status: string;
  }>;
}

export interface DocumentReviewResponse {
  document: {
    id: string;
    document_type: string;
    status: string;
    original_filename: string;
    mime_type: string;
    file_preview_url: string;
    raw_ocr_text: string | null;
    provider_name: string | null;
  };
  draft_records: Array<{
    id: string;
    target_entity: string;
    status: string;
    ai_normalized_data: unknown;
    confirmed_data: unknown;
    validation_errors: unknown;
    confidence_score: number | null;
    official_record_id: string | null;
  }>;
}

export interface ConfirmDraftResponse {
  draft_id: string;
  status: string;
  official_record: {
    type: string;
    id: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

// Re-export enums for convenience
export { OcrBatch, OcrDocument, OcrDraftRecord, OcrAuditLog };
