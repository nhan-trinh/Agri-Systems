import { carbonRepository } from './carbon.repository';

export class CarbonService {
  public async getHelloMessage(): Promise<string> {
    return 'Hello from Carbon Service';
  }
}

export const carbonService = new CarbonService();
