import { warehouseRepository } from './warehouse.repository';

export class WarehouseService {
  public async getHelloMessage(): Promise<string> {
    return 'Hello from Warehouse Service';
  }
}

export const warehouseService = new WarehouseService();
