import { IStorageService } from './storage.interface';
import { localStorageService } from './local.storage.service';
import { s3StorageService } from './s3.storage.service';
import config from '../../config/app.config';

export class StorageFactory {
  public static getStorageService(): IStorageService {
    const type = config.storage?.type || 'local';
    
    if (type === 's3') {
      return s3StorageService;
    }
    
    return localStorageService;
  }
}
export default StorageFactory;
