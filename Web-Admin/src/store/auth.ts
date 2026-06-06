import { create } from 'zustand';

export interface User {
  id: string;
  phone: string;
  role: 'SUPER_ADMIN' | 'HTX_MANAGER' | 'FARMER' | 'WAREHOUSE_KEEPER' | 'GOV_VIEWER' | 'PUBLIC';
  cooperativeId: string | null;
  farmerId: string | null;
  zaloId: string | null;
  zaloName: string | null;
  avatarUrl: string | null;
  isFirstLogin: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isInitialized: boolean;
  setAuth: (user: User | null, accessToken: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isInitialized: false,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  logout: () => {
    localStorage.removeItem('refresh_token');
    set({ user: null, accessToken: null });
  },
}));

