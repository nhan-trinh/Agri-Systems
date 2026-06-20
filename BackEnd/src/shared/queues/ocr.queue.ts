import { Queue } from 'bullmq';
import { bullConnection } from './carbon.queue';

/**
 * BullMQ queue for OCR document processing.
 * Jobs are added by OcrService after file upload; consumed by the OCR worker.
 *
 * Retry policy: 3 attempts with exponential backoff starting at 30s.
 * Concurrency is controlled at the Worker level (recommend 1-2 for pilot).
 */
export const ocrDocumentQueue = new Queue('ocr-document-process', {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30_000, // 30s → 2m → 10m
    },
  },
});
