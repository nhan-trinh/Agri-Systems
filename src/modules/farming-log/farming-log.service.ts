import { farmingLogRepository } from './farming-log.repository';

export class FarmingLogService {
  public async getHelloMessage(): Promise<string> {
    return 'Hello from FarmingLog Service';
  }
}

export const farmingLogService = new FarmingLogService();
