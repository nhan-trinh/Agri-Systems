import { IStorageService } from './storage.interface';

export class S3StorageService implements IStorageService {
  public async saveFile(relativePath: string, buffer: Buffer): Promise<string> {
    console.warn('[S3StorageService] AWS S3 is not implemented yet. File not saved.');
    return `https://s3.amazonaws.com/mock-bucket/${relativePath}`;
  }

  public async deleteFile(relativePath: string): Promise<void> {
    console.warn(`[S3StorageService] AWS S3 is not implemented yet. File ${relativePath} not deleted.`);
  }
}
export const s3StorageService = new S3StorageService();
