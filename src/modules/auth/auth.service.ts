import { authRepository } from './auth.repository';

export class AuthService {
  public async getHelloMessage(): Promise<string> {
    return 'Hello from Auth Service';
  }
}

export const authService = new AuthService();
