import { z } from 'zod';

// ==================== UPLOAD BATCH (form fields) ====================
// multipart/form-data fields alongside `files`. Multer handles file validation separately.

export const UploadBatchFieldsDto = z.object({
  document_hint: z
    .enum(['FARMING_LOGBOOK', 'MATERIAL_INVOICE', 'AUTO'])
    .default('AUTO'),
  season_id: z.string().min(1).optional(), // only relevant for FARMING_LOGBOOK
  batch_id: z.string().min(1).optional(), // optional shipment/batch context
});

// ==================== LIST BATCHES (query) ====================

export const ListOcrBatchesQueryDto = z.object({
  status: z
    .enum(['QUEUED', 'PROCESSING', 'AWAITING_REVIEW', 'PARTIALLY_FAILED', 'CONFIRMED', 'ERROR'])
    .optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ==================== UPDATE DRAFT ====================
// Reviewer edits confirmed_data before calling /confirm.
// confirmed_data is a free-form object (validated at confirm-time against target entity DTO).

export const UpdateDraftDto = z.object({
  confirmed_data: z.record(z.string(), z.unknown()),
});

// ==================== REJECT DOCUMENT ====================

export const RejectDocumentDto = z.object({
  reason: z.string().min(5, 'Lý do từ chối phải có ít nhất 5 ký tự').max(500),
});

// ==================== INFERRED TYPES ====================

export type UploadBatchFieldsDtoType = z.infer<typeof UploadBatchFieldsDto>;
export type ListOcrBatchesQueryDtoType = z.infer<typeof ListOcrBatchesQueryDto>;
export type UpdateDraftDtoType = z.infer<typeof UpdateDraftDto>;
export type RejectDocumentDtoType = z.infer<typeof RejectDocumentDto>;
