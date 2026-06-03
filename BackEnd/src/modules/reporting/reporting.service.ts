import { reportingRepository } from './reporting.repository';

export class ReportingService {
  public async getHelloMessage(): Promise<string> {
    return 'Hello from Reporting Service';
  }
}

export const reportingService = new ReportingService();
