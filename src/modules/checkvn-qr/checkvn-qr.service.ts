import { checkvnQrRepository } from './checkvn-qr.repository';

export class CheckvnQrService {
  public async getHelloMessage(): Promise<string> {
    return 'Hello from CheckvnQr Service';
  }
}

export const checkvnQrService = new CheckvnQrService();
