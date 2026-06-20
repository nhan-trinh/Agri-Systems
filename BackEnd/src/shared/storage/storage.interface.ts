export interface IStorageService {
  /**
   * Saves a file to the storage provider.
   * @param relativePath Relative path including filename (e.g. 'certificates/CARBON-123.pdf')
   * @param buffer File buffer content
   * @returns Object URL and the storage key used for later retrieval
   */
  saveFile(relativePath: string, buffer: Buffer): Promise<StorageSaveResult>;

  /**
   * Deletes a file from the storage provider.
   * @param relativePath Relative path to the file
   */
  deleteFile(relativePath: string): Promise<void>;

  /**
   * Generates a short-lived presigned URL for private file download.
   * For local storage, returns a plain public URL (files served by express.static).
   * @param relativePath Relative path to the file
   * @param expirySec Presigned URL lifetime in seconds (default 900 = 15 min)
   */
  getPresignedDownloadUrl(relativePath: string, expirySec?: number): Promise<string>;

  /**
   * Reads a file from storage into memory as a Buffer.
   * Used by background workers (OCR, certificate generation) that need raw bytes.
   * @param relativePath Relative path to the file
   */
  getFileBuffer(relativePath: string): Promise<Buffer>;
}

export interface StorageSaveResult {
  url: string;
  objectKey: string;
}
