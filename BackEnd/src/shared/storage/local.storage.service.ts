import fs from 'fs';
import path from 'path';
import { IStorageService } from './storage.interface';
import config from '../../config/app.config';

export class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor() {
    // Resolve local directory path. Config is usually './public/uploads' or './uploads'
    const configuredPath = config.storage?.localPath || './public/uploads';
    this.baseDir = path.resolve(process.cwd(), configuredPath);
    
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  public async saveFile(relativePath: string, buffer: Buffer): Promise<string> {
    const fullPath = path.join(this.baseDir, relativePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, buffer);
    
    const urlPath = relativePath.replace(/\\/g, '/');
    return `${config.appUrl}/uploads/${urlPath}`;
  }

  public async deleteFile(relativePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}
export const localStorageService = new LocalStorageService();
