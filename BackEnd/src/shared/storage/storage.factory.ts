import { IStorageService } from './storage.interface';
import { localStorageService } from './local.storage.service';
import { r2StorageService } from './s3.storage.service';
import config from '../../config/app.config';

export class StorageFactory {
  public static getStorageService(): IStorageService {
    const type = config.storage?.type || 'local';

    // Both 'r2' (Cloudflare R2) and 's3' (legacy alias) use the S3-compatible service.
    if (type === 'r2' || type === 's3') {
      return r2StorageService;
    }

    return localStorageService;
  }
}
export default StorageFactory;
