import { Worker, Job } from 'bullmq';
import { bullConnection } from '../shared/queues/carbon.queue';
import { OcrDocumentJobPayload } from '../shared/queues/queue.types';
import { ocrRepository, CreateDraftInput } from '../modules/ocr/ocr.repository';
import { ocrValidationService } from '../modules/ocr/ocr.validation.service';
import { getOcrProvider, getAiNormalizer } from '../modules/ocr/providers/provider.factory';
import StorageFactory from '../shared/storage/storage.factory';
import { OcrDocumentStatus, OcrDocumentType, OcrTargetEntity, OcrBatchStatus, Prisma } from '@prisma/client';

/**
 * OCR Worker — background pipeline that processes each uploaded document.
 *
 * Pipeline per job:
 *  1. Load document; skip if already AWAITING_REVIEW/CONFIRMED (idempotent).
 *  2. Mark PROCESSING.
 *  3. Fetch file buffer from object storage.
 *  4. OCR provider extracts raw text + layout.
 *  5. AI normalizer classifies + maps to structured draft JSON.
 *  6. Validate each draft → store validation_errors.
 *  7. Save raw OCR + drafts; mark AWAITING_REVIEW.
 *  8. Recompute batch status.
 *
 * On error: mark document ERROR (keep original file), re-throw so BullMQ retries.
 */
export class OcrWorker {
  private worker: Worker;

  constructor() {
    const provider = getOcrProvider();
    const normalizer = getAiNormalizer();

    this.worker = new Worker(
      'ocr-document-process',
      async (job: Job<OcrDocumentJobPayload>) => {
        const { document_id: documentId, batch_id: batchId, cooperative_id: cooperativeId, object_key: objectKey, hint, season_id: seasonId } = job.data;
        console.log(`[OcrWorker] Processing document ${documentId} (batch ${batchId})`);

        const doc = await ocrRepository.findDocumentById(documentId);
        if (!doc) {
          throw new Error(`OcrDocument not found: ${documentId}`);
        }

        // Idempotency: skip if already processed
        if (doc.status === OcrDocumentStatus.AWAITING_REVIEW || doc.status === OcrDocumentStatus.CONFIRMED) {
          console.log(`[OcrWorker] Document ${documentId} already ${doc.status}, skipping`);
          return;
        }

        try {
          // 1. Mark PROCESSING
          await ocrRepository.updateDocumentStatus(documentId, OcrDocumentStatus.PROCESSING);
          await ocrRepository.updateBatchStatus(batchId, OcrBatchStatus.PROCESSING);

          // 2. Fetch file buffer from storage
          const storage = StorageFactory.getStorageService();
          const fileBuffer = await storage.getFileBuffer(objectKey);

          // 3. OCR extraction
          const rawResult = await provider.extract(fileBuffer, doc.mime_type);

          // 4. AI classification + normalization
          const normalizedDrafts = await normalizer.normalize(rawResult.text, hint, {
            cooperativeId,
          });

          // 5. Build draft records with validation
          const draftInputs: CreateDraftInput[] = [];
          let detectedType: OcrDocumentType = 'UNKNOWN';

          for (const nd of normalizedDrafts) {
            detectedType = nd.document_type;

            // If a season_id hint was provided for a farming log, inject it
            const normalizedData = { ...nd.ai_normalized_data };
            if (nd.target_entity === 'FARMING_LOG' && seasonId && !normalizedData.season_id) {
              normalizedData.season_id = seasonId;
            }

            // Run validation to surface errors on the review screen
            let validationErrors: Prisma.InputJsonValue | undefined;
            if (nd.target_entity === 'FARMING_LOG') {
              const { errors } = await ocrValidationService.validateFarmingLogDraft(
                normalizedData as Record<string, unknown>,
                cooperativeId,
              );
              if (errors.length > 0) validationErrors = errors as unknown as Prisma.InputJsonValue;
            } else if (nd.target_entity === 'WAREHOUSE_TRANSACTION') {
              const txType = (normalizedData.transaction_type as string | undefined)?.toUpperCase() === 'EXPORT'
                ? 'EXPORT' : 'IMPORT';
              const { errors } = await ocrValidationService.validateWarehouseDraft(
                normalizedData as Record<string, unknown>,
                cooperativeId,
                txType,
              );
              if (errors.length > 0) validationErrors = errors as unknown as Prisma.InputJsonValue;
            }

            draftInputs.push({
              document_id: documentId,
              target_entity: nd.target_entity as OcrTargetEntity,
              raw_extracted_data: { text: rawResult.text } as Prisma.InputJsonValue,
              ai_normalized_data: normalizedData as Prisma.InputJsonValue,
              confidence_score: nd.confidence_score,
              validation_errors: validationErrors,
            });
          }

          // 6. Persist raw OCR result + drafts, mark AWAITING_REVIEW
          await ocrRepository.saveOcrResult({
            documentId,
            documentType: detectedType,
            rawOcrText: rawResult.text,
            rawOcrData: { blocks: rawResult.blocks, confidence: rawResult.confidence } as Prisma.InputJsonValue,
            providerName: provider.name,
            drafts: draftInputs,
          });

          // 7. Recompute batch status
          await ocrRepository.recomputeBatchStatus(batchId);

          console.log(`[OcrWorker] Completed document ${documentId}: ${draftInputs.length} draft(s), type=${detectedType}`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[OcrWorker] Document ${documentId} failed:`, message);

          // Mark document ERROR but keep the original file
          await ocrRepository.updateDocumentStatus(documentId, OcrDocumentStatus.ERROR, {
            error_code: 'OCR_PROCESSING_ERROR',
            error_message: message,
          });
          await ocrRepository.recomputeBatchStatus(batchId);

          // Re-throw so BullMQ applies retry policy (3 attempts, exponential backoff)
          throw error;
        }
      },
      { connection: bullConnection, concurrency: 2 },
    );

    this.worker.on('failed', (job, err) => {
      console.error(`[OcrWorker] Job ${job?.id} failed permanently:`, err.message);
    });
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}

export const ocrWorker = new OcrWorker();
export default ocrWorker;
