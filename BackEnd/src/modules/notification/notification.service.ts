import { notificationRepository } from './notification.repository';

export class NotificationService {
  public async getHelloMessage(): Promise<string> {
    return 'Hello from Notification Service';
  }
}

export const notificationService = new NotificationService();
