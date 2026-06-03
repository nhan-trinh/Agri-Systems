import { farmerRepository } from './farmer.repository';

export class FarmerService {
  public async getHelloMessage(): Promise<string> {
    return 'Hello from Farmer Service';
  }
}

export const farmerService = new FarmerService();
