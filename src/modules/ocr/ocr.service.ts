import { ocrRepository } from './ocr.repository';

export class OcrService {
  public async getHelloMessage(): Promise<string> {
    return 'Hello from Ocr Service';
  }
}

export const ocrService = new OcrService();
