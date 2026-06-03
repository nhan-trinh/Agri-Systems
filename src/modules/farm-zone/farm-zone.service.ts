import { farmZoneRepository } from './farm-zone.repository';

export class FarmZoneService {
  public async getHelloMessage(): Promise<string> {
    return 'Hello from FarmZone Service';
  }
}

export const farmZoneService = new FarmZoneService();
