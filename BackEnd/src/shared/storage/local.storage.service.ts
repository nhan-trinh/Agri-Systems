import fs from 'fs';
import path from 'path';
import { IStorageService } from './storage.interface';
import config from '../../config/app.config';

export class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor() {
    const configuredPath = config.storage?.localPath || './public/uploads';
    this.baseDir = path.resolve(process.cwd(), configuredPath);

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public async saveFile(relativePath: string, buffer: Buffer): Promise<{ url: string; objectKey: string }> {
    const fullPath = path.join(this.baseDir, relativePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, buffer);

    const urlPath = relativePath.replace(/\\/g, '/');
    const url = `${config.appUrl}/uploads/${urlPath}`;
    return { url, objectKey: urlPath };
  }

  public async deleteFile(relativePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  /**
   * For local storage, files are served publicly via express.static,
   * so we return the public URL directly (no presigned logic needed).
   */
  public async getPresignedDownloadUrl(relativePath: string, _expirySec?: number): Promise<string> {
    const urlPath = relativePath.replace(/\\/g, '/');
    return `${config.appUrl}/uploads/${urlPath}`;
  }

  /**
   * Reads a file from local disk into a Buffer.
   */
  public async getFileBuffer(relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, relativePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found in local storage: ${relativePath}`);
    }
    return fs.readFileSync(fullPath);
  }
}
export const localStorageService = new LocalStorageService();
