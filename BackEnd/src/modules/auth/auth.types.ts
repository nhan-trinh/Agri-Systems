import { UserRole } from '@prisma/client';

// ==================== JWT ====================

export interface JwtPayload {
  userId: string;
  role: UserRole;
  cooperativeId: string | null;
  farmerId: string | null;
  isFirstLogin: boolean;
}

export interface JwtTokenPair {
  accessToken: string;
  refreshToken: string;
}

// ==================== Zalo ====================

export interface ZaloProfile {
  zaloId: string;
  name: string;
  avatar: string | null;
}

export interface ZaloTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  error?: number;
  message?: string;
}

// ==================== Auth Responses ====================

export interface AuthUserResponse {
  id: string;
  phone: string | null;
  role: UserRole;
  cooperativeId: string | null;
  farmerId: string | null;
  zaloId: string | null;
  zaloName: string | null;
  avatarUrl: string | null;
  isFirstLogin: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUserResponse;
}

// ==================== Extend Express Request ====================

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
