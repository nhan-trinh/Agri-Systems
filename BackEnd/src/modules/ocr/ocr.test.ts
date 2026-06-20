import { ocrService } from './ocr.service';
import { ocrConfirmationService } from './ocr.confirmation.service';
import { ocrRepository } from './ocr.repository';
import { ocrAuditService } from './ocr.audit.service';
import { ocrValidationService } from './ocr.validation.service';
import { ocrDocumentQueue } from '../../shared/queues/ocr.queue';
import StorageFactory from '../../shared/storage/storage.factory';
import { farmingLogService } from '../farming-log/farming-log.service';
import { warehouseService } from '../warehouse/warehouse.service';
import { StubOcrProvider } from './providers/stub-ocr.provider';
import { StubAiNormalizer } from './providers/stub-ai.normalizer';
import { UserRole, OcrDocumentStatus, OcrDraftStatus } from '@prisma/client';
import { AppError } from '../../shared/utils/app-error';

// ── Mock dependencies ────────────────────────────────────────────
jest.mock('./ocr.repository');
jest.mock('./ocr.audit.service');
jest.mock('./ocr.validation.service');
jest.mock('../../shared/queues/ocr.queue', () => ({
  ocrDocumentQueue: { add: jest.fn().mockResolvedValue({}) },
}));
jest.mock('../../shared/storage/storage.factory', () => ({
  __esModule: true,
  default: {
    getStorageService: jest.fn().mockReturnValue({
      saveFile: jest.fn().mockResolvedValue({ url: 'http://localhost/uploads/x', objectKey: 'ocr/x' }),
      getPresignedDownloadUrl: jest.fn().mockResolvedValue('http://localhost/uploads/preview'),
      getFileBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));
jest.mock('../farming-log/farming-log.service');
jest.mock('../warehouse/warehouse.service');

const mockRepo = ocrRepository as jest.Mocked<typeof ocrRepository>;
const mockAudit = ocrAuditService as jest.Mocked<typeof ocrAuditService>;
const mockValidation = ocrValidationService as jest.Mocked<typeof ocrValidationService>;
const mockFarmingLogService = farmingLogService as jest.Mocked<typeof farmingLogService>;
const mockWarehouseService = warehouseService as jest.Mocked<typeof warehouseService>;
const mockStorage = StorageFactory.getStorageService() as jest.Mocked<ReturnType<typeof StorageFactory.getStorageService>>;

// ── Shared fixtures ──────────────────────────────────────────────

const mockManager = {
  userId: 'mgr-1',
  role: UserRole.HTX_MANAGER,
  cooperativeId: 'coop-1',
  farmerId: null,
  isFirstLogin: false,
};

const mockManagerOtherCoop = {
  ...mockManager,
  userId: 'mgr-2',
  cooperativeId: 'coop-other',
};

const mockAdmin = {
  userId: 'admin-1',
  role: UserRole.SUPER_ADMIN,
  cooperativeId: 'coop-1',
  farmerId: null,
  isFirstLogin: false,
};

function makeFile(filename: string, mime = 'image/jpeg', size = 1024): Express.Multer.File {
  return {
    fieldname: 'files',
    originalname: filename,
    encoding: '7bit',
    mimetype: mime,
    size,
    buffer: Buffer.alloc(size, 1),
    destination: '',
    filename: '',
    path: '',
    stream: null as never,
  };
}

// ── Provider unit tests (no mocking) ─────────────────────────────

describe('Stub Provider Adapters', () => {
  describe('StubOcrProvider', () => {
    it('returns deterministic Vietnamese OCR text with high confidence', async () => {
      const provider = new StubOcrProvider();
      const result = await provider.extract(Buffer.from('invoice-data'), 'image/jpeg');

      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.text).toContain('HỢP TÁC XÃ');
      expect(result.blocks).toBeDefined();
      expect(result.blocks!.length).toBeGreaterThan(0);
    });

    it('produces stable output for identical input', async () => {
      const provider = new StubOcrProvider();
      const buf = Buffer.from('stable');
      const a = await provider.extract(buf, 'image/png');
      const b = await provider.extract(buf, 'image/png');
      expect(a.text).toBe(b.text);
    });
  });

  describe('StubAiNormalizer', () => {
    it('classifies invoice text as MATERIAL_INVOICE → WAREHOUSE_TRANSACTION', async () => {
      const normalizer = new StubAiNormalizer();
      const drafts = await normalizer.normalize(
        'PHIẾU NHẬP KHO VẬT TƯ\nNhà cung cấp: X\nSố hóa đơn: HD/1\nĐơn giá 15000',
        'AUTO',
      );
      expect(drafts.length).toBeGreaterThan(0);
      expect(drafts[0].target_entity).toBe('WAREHOUSE_TRANSACTION');
      expect(drafts[0].document_type).toBe('MATERIAL_INVOICE');
      expect(drafts[0].ai_normalized_data).toHaveProperty('supplier');
      expect(drafts[0].ai_normalized_data).toHaveProperty('invoice_no');
    });

    it('respects an explicit FARMING_LOGBOOK hint', async () => {
      const normalizer = new StubAiNormalizer();
      const drafts = await normalizer.normalize('random text', 'FARMING_LOGBOOK');
      expect(drafts[0].target_entity).toBe('FARMING_LOG');
      expect(drafts[0].document_type).toBe('FARMING_LOGBOOK');
    });

    it('returns UNKNOWN when nothing matches', async () => {
      const normalizer = new StubAiNormalizer();
      const drafts = await normalizer.normalize('xyz qqq zzz', 'AUTO');
      expect(drafts[0].document_type).toBe('UNKNOWN');
      expect(drafts[0].confidence_score).toBeLessThan(0.5);
    });
  });
});

// ── OcrService.uploadBatch ──────────────────────────────────────

describe('OcrService — uploadBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves files, creates batch + documents, and enqueues jobs (202 flow)', async () => {
    mockRepo.createBatchWithDocuments.mockResolvedValue({
      id: 'batch-1',
      cooperative_id: 'coop-1',
      uploaded_by: 'mgr-1',
      status: 'QUEUED',
      total_files: 2,
      processed_files: 0,
      failed_files: 0,
      created_at: new Date(),
      updated_at: new Date(),
      documents: [
        { id: 'doc-1', original_filename: 'a.jpg', status: 'QUEUED' },
        { id: 'doc-2', original_filename: 'b.jpg', status: 'QUEUED' },
      ] as never[],
    });

    const result = await ocrService.uploadBatch(
      [makeFile('a.jpg'), makeFile('b.jpg')],
      { document_hint: 'AUTO' } as never,
      mockManager,
    );

    expect(mockStorage.saveFile).toHaveBeenCalledTimes(2);
    expect(mockRepo.createBatchWithDocuments).toHaveBeenCalledTimes(1);
    expect(ocrDocumentQueue.add).toHaveBeenCalledTimes(2);
    expect(result.batch_id).toBe('batch-1');
    expect(result.documents).toHaveLength(2);
  });

  it('rejects when no files are provided', async () => {
    await expect(
      ocrService.uploadBatch([], { document_hint: 'AUTO' } as never, mockManager),
    ).rejects.toThrow('Vui lòng tải lên ít nhất một tệp');
  });

  it('rejects unsupported MIME types (defense in depth)', async () => {
    await expect(
      ocrService.uploadBatch(
        [makeFile('evil.exe', 'application/x-msdownload')],
        { document_hint: 'AUTO' } as never,
        mockManager,
      ),
    ).rejects.toThrow('không đúng định dạng');
  });

  it('requires cooperative_id from JWT (security: never from body)', async () => {
    const noCoop = { ...mockManager, cooperativeId: null };
    await expect(
      ocrService.uploadBatch([makeFile('a.jpg')], { document_hint: 'AUTO' } as never, noCoop),
    ).rejects.toThrow('không thuộc hợp tác xã');
  });
});

// ── OcrService.getDocumentReview (RBAC) ─────────────────────────

describe('OcrService — getDocumentReview RBAC', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows access to own cooperative document', async () => {
    mockRepo.findDocumentById.mockResolvedValue({
      id: 'doc-1',
      cooperative_id: 'coop-1',
      batch_id: 'b-1',
      uploaded_by: 'mgr-1',
      original_filename: 'a.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 100,
      page_count: null,
      file_sha256: null,
      object_key: 'ocr/coop-1/a.jpg',
      document_type: 'FARMING_LOGBOOK',
      status: OcrDocumentStatus.AWAITING_REVIEW,
      error_code: null,
      error_message: null,
      raw_ocr_text: 'text',
      raw_ocr_data: null,
      provider_name: 'stub',
      provider_metadata: null,
      created_at: new Date(),
      updated_at: new Date(),
      batch: {} as never,
      draft_records: [],
    });

    const result = await ocrService.getDocumentReview('doc-1', mockManager);
    expect(result.document.id).toBe('doc-1');
    expect(result.document.file_preview_url).toBe('http://localhost/uploads/preview');
  });

  it('blocks cross-cooperative access for HTX_MANAGER (403)', async () => {
    mockRepo.findDocumentById.mockResolvedValue({
      id: 'doc-1',
      cooperative_id: 'coop-1',
      batch_id: 'b-1',
      uploaded_by: 'mgr-1',
      original_filename: 'a.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 100,
      page_count: null,
      file_sha256: null,
      object_key: 'x',
      document_type: 'FARMING_LOGBOOK',
      status: OcrDocumentStatus.AWAITING_REVIEW,
      error_code: null,
      error_message: null,
      raw_ocr_text: null,
      raw_ocr_data: null,
      provider_name: null,
      provider_metadata: null,
      created_at: new Date(),
      updated_at: new Date(),
      batch: {} as never,
      draft_records: [],
    });

    await expect(
      ocrService.getDocumentReview('doc-1', mockManagerOtherCoop),
    ).rejects.toThrow('Bạn không có quyền');
  });
});

// ── OcrConfirmationService ───────────────────────────────────────

describe('OcrConfirmationService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('confirms a FARMING_LOG draft by calling farmingLogService.createLog', async () => {
    mockRepo.findDraftById.mockResolvedValue({
      id: 'draft-1',
      document_id: 'doc-1',
      target_entity: 'FARMING_LOG',
      status: OcrDraftStatus.DRAFT,
      raw_extracted_data: {},
      ai_normalized_data: { season_id: 's1', activity_type: 'FERTILIZING' },
      confirmed_data: null,
      validation_errors: null,
      confidence_score: 0.8,
      official_record_id: null,
      confirmed_by: null,
      confirmed_at: null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      document: { id: 'doc-1', cooperative_id: 'coop-1' } as never,
    });

    mockValidation.validateFarmingLogDraft.mockResolvedValue({ valid: true, errors: [] });
    mockFarmingLogService.createLog.mockResolvedValue({ id: 'flog-1' } as never);

    const result = await ocrConfirmationService.confirmDraft('draft-1', mockManager);

    expect(mockFarmingLogService.createLog).toHaveBeenCalledTimes(1);
    expect(mockRepo.markDraftConfirmed).toHaveBeenCalledWith(
      'draft-1', 'flog-1', 'mgr-1', expect.anything(), 'FARMING_LOG', 'doc-1',
    );
    expect(result.status).toBe('CONFIRMED');
    expect(result.official_record).toEqual({ type: 'FARMING_LOG', id: 'flog-1' });
  });

  it('confirms a WAREHOUSE_TRANSACTION IMPORT draft via warehouseService.importStock', async () => {
    mockRepo.findDraftById.mockResolvedValue({
      id: 'draft-2',
      document_id: 'doc-2',
      target_entity: 'WAREHOUSE_TRANSACTION',
      status: OcrDraftStatus.DRAFT,
      raw_extracted_data: {},
      ai_normalized_data: { transaction_type: 'IMPORT', material_id: 'm1' },
      confirmed_data: null,
      validation_errors: null,
      confidence_score: 0.8,
      official_record_id: null,
      confirmed_by: null,
      confirmed_at: null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      document: { id: 'doc-2', cooperative_id: 'coop-1' } as never,
    });

    mockValidation.validateWarehouseDraft.mockResolvedValue({ valid: true, errors: [] });
    mockWarehouseService.importStock.mockResolvedValue({
      transaction: { id: 'wtx-1' },
      stockItem: { id: 'si-1' },
    } as never);

    const result = await ocrConfirmationService.confirmDraft('draft-2', mockManager);

    expect(mockWarehouseService.importStock).toHaveBeenCalledTimes(1);
    expect(result.official_record).toEqual({ type: 'WAREHOUSE_TRANSACTION', id: 'wtx-1' });
  });

  it('blocks confirmation when validation fails (keeps draft state, no domain call)', async () => {
    mockRepo.findDraftById.mockResolvedValue({
      id: 'draft-3',
      document_id: 'doc-3',
      target_entity: 'FARMING_LOG',
      status: OcrDraftStatus.DRAFT,
      raw_extracted_data: {},
      ai_normalized_data: {},
      confirmed_data: null,
      validation_errors: null,
      confidence_score: null,
      official_record_id: null,
      confirmed_by: null,
      confirmed_at: null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      document: { id: 'doc-3', cooperative_id: 'coop-1' } as never,
    });

    mockValidation.validateFarmingLogDraft.mockResolvedValue({
      valid: false,
      errors: [{ field: 'season_id', message: 'required' }],
    });

    await expect(
      ocrConfirmationService.confirmDraft('draft-3', mockManager),
    ).rejects.toThrow('không hợp lệ');

    expect(mockFarmingLogService.createLog).not.toHaveBeenCalled();
    expect(mockRepo.markDraftConfirmed).not.toHaveBeenCalled();
  });

  it('rejects a draft that is already CONFIRMED', async () => {
    mockRepo.findDraftById.mockResolvedValue({
      id: 'draft-4',
      document_id: 'doc-4',
      target_entity: 'FARMING_LOG',
      status: OcrDraftStatus.CONFIRMED,
      raw_extracted_data: {},
      ai_normalized_data: {},
      confirmed_data: {},
      validation_errors: null,
      confidence_score: null,
      official_record_id: 'flog-x',
      confirmed_by: 'mgr-1',
      confirmed_at: new Date(),
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      document: { id: 'doc-4', cooperative_id: 'coop-1' } as never,
    });

    await expect(
      ocrConfirmationService.confirmDraft('draft-4', mockManager),
    ).rejects.toThrow('đã được xác nhận');
  });

  it('enforces cooperative RBAC on confirmation', async () => {
    mockRepo.findDraftById.mockResolvedValue({
      id: 'draft-5',
      document_id: 'doc-5',
      target_entity: 'FARMING_LOG',
      status: OcrDraftStatus.DRAFT,
      raw_extracted_data: {},
      ai_normalized_data: {},
      confirmed_data: null,
      validation_errors: null,
      confidence_score: null,
      official_record_id: null,
      confirmed_by: null,
      confirmed_at: null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      document: { id: 'doc-5', cooperative_id: 'coop-1' } as never,
    });

    await expect(
      ocrConfirmationService.confirmDraft('draft-5', mockManagerOtherCoop),
    ).rejects.toThrow('Bạn chỉ được phép xác nhận');
  });
});

// ── OcrService.rejectDocument ────────────────────────────────────

describe('OcrService — rejectDocument', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks document REJECTED and writes an audit log', async () => {
    mockRepo.findDocumentById.mockResolvedValue({
      id: 'doc-r',
      cooperative_id: 'coop-1',
      batch_id: 'b-r',
      uploaded_by: 'mgr-1',
      original_filename: 'blurry.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 100,
      page_count: null,
      file_sha256: null,
      object_key: 'x',
      document_type: 'UNKNOWN',
      status: OcrDocumentStatus.AWAITING_REVIEW,
      error_code: null,
      error_message: null,
      raw_ocr_text: null,
      raw_ocr_data: null,
      provider_name: null,
      provider_metadata: null,
      created_at: new Date(),
      updated_at: new Date(),
      batch: {} as never,
      draft_records: [],
    });
    mockRepo.recomputeBatchStatus.mockResolvedValue('AWAITING_REVIEW' as never);

    const result = await ocrService.rejectDocument('doc-r', 'Ảnh quá mờ không đọc được', mockManager);

    expect(mockRepo.rejectDocument).toHaveBeenCalledWith('doc-r', 'mgr-1', 'Ảnh quá mờ không đọc được');
    expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'REJECT' }));
    expect(result.status).toBe(OcrDocumentStatus.REJECTED);
  });

  it('cannot reject an already-CONFIRMED document', async () => {
    mockRepo.findDocumentById.mockResolvedValue({
      id: 'doc-c',
      cooperative_id: 'coop-1',
      batch_id: 'b-c',
      uploaded_by: 'mgr-1',
      original_filename: 'a.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 100,
      page_count: null,
      file_sha256: null,
      object_key: 'x',
      document_type: 'FARMING_LOGBOOK',
      status: OcrDocumentStatus.CONFIRMED,
      error_code: null,
      error_message: null,
      raw_ocr_text: null,
      raw_ocr_data: null,
      provider_name: null,
      provider_metadata: null,
      created_at: new Date(),
      updated_at: new Date(),
      batch: {} as never,
      draft_records: [],
    });

    await expect(
      ocrService.rejectDocument('doc-c', 'some reason here', mockManager),
    ).rejects.toThrow('Không thể từ chối tài liệu đã xác nhận');
  });
});

// ── OcrService.retryDocument ─────────────────────────────────────

describe('OcrService — retryDocument', () => {
  beforeEach(() => jest.clearAllMocks());

  it('re-enqueues a failed document and clears errors', async () => {
    mockRepo.findDocumentById.mockResolvedValue({
      id: 'doc-f',
      cooperative_id: 'coop-1',
      batch_id: 'b-f',
      uploaded_by: 'mgr-1',
      original_filename: 'a.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 100,
      page_count: null,
      file_sha256: null,
      object_key: 'ocr/coop-1/a.jpg',
      document_type: 'UNKNOWN',
      status: OcrDocumentStatus.ERROR,
      error_code: 'OCR_PROCESSING_ERROR',
      error_message: 'timeout',
      raw_ocr_text: null,
      raw_ocr_data: null,
      provider_name: null,
      provider_metadata: null,
      created_at: new Date(),
      updated_at: new Date(),
      batch: {} as never,
      draft_records: [],
    });

    const result = await ocrService.retryDocument('doc-f', mockManager);

    expect(mockRepo.updateDocumentStatus).toHaveBeenCalledWith(
      'doc-f', OcrDocumentStatus.QUEUED, { error_code: null, error_message: null },
    );
    expect(ocrDocumentQueue.add).toHaveBeenCalledWith('process', expect.objectContaining({ document_id: 'doc-f' }));
    expect(result.status).toBe(OcrDocumentStatus.QUEUED);
  });

  it('only retries documents in ERROR state', async () => {
    mockRepo.findDocumentById.mockResolvedValue({
      id: 'doc-ok',
      cooperative_id: 'coop-1',
      batch_id: 'b-ok',
      uploaded_by: 'mgr-1',
      original_filename: 'a.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 100,
      page_count: null,
      file_sha256: null,
      object_key: 'x',
      document_type: 'FARMING_LOGBOOK',
      status: OcrDocumentStatus.AWAITING_REVIEW,
      error_code: null,
      error_message: null,
      raw_ocr_text: 'text',
      raw_ocr_data: null,
      provider_name: 'stub',
      provider_metadata: null,
      created_at: new Date(),
      updated_at: new Date(),
      batch: {} as never,
      draft_records: [],
    });

    await expect(
      ocrService.retryDocument('doc-ok', mockManager),
    ).rejects.toThrow('Chỉ có thể xử lý lại tài liệu đang lỗi');
  });
});
