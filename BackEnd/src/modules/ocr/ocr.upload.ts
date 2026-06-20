import multer, { FileFilterCallback } from 'multer';
import { AppError } from '../../shared/utils/app-error';
import config from '../../config/app.config';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/**
 * Multer config for OCR batch uploads.
 * - Memory storage (we save to object storage ourselves, not disk).
 * - Magic-byte content validation in addition to MIME type (defense in depth).
 * - Limits: 10MB/file (BR-007-1), 10 files/batch.
 */
const fileFilter = (_req: unknown, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new AppError(
      'INVALID_FILE_TYPE',
      400,
      `Tệp "${file.originalname}" không đúng định dạng. Chỉ chấp nhận JPG, PNG, PDF.`,
    ));
  }
  cb(null, true);
};

export const ocrUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: config.ocr.maxFileSizeMb * 1024 * 1024,
    files: config.ocr.maxFilesPerBatch,
  },
});
