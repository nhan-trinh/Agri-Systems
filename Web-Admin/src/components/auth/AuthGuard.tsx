'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import axios from 'axios';

const PUBLIC_ROUTES = ['/login', '/forgot-password'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, accessToken, isInitialized, setAuth, setInitialized, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const refreshToken = localStorage.getItem('refresh_token');

      if (!accessToken && refreshToken) {
        setLoadingProfile(true);
        try {
          // 1. Silent Refresh to get new accessToken
          const refreshRes = await axios.post(
            (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1') + '/auth/refresh',
            { refresh_token: refreshToken }
          );

          if (refreshRes.data?.success) {
            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshRes.data.data;
            localStorage.setItem('refresh_token', newRefreshToken);

            // 2. Fetch User Profile using new accessToken
            const profileRes = await axios.get(
              (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1') + '/auth/me',
              {
                headers: { Authorization: `Bearer ${newAccessToken}` },
              }
            );

            if (profileRes.data?.success) {
              setAuth(profileRes.data.data, newAccessToken);
            } else {
              throw new Error('Failed to fetch profile');
            }
          } else {
            throw new Error('Refresh failed');
          }
        } catch (error) {
          console.error('Session restoration failed:', error);
          logout();
        } finally {
          setLoadingProfile(false);
          setInitialized(true);
        }
      } else {
        setInitialized(true);
      }
    };

    initializeAuth();
  }, [accessToken, setAuth, setInitialized, logout]);

  useEffect(() => {
    if (!isInitialized || loadingProfile) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (!accessToken) {
      // User is NOT logged in
      if (!isPublicRoute) {
        router.push('/login');
      }
    } else {
      // User IS logged in
      if (user?.isFirstLogin) {
        if (pathname !== '/first-login') {
          router.push('/first-login');
        }
      } else {
        if (isPublicRoute || pathname === '/first-login') {
          router.push('/');
        }
      }
    }
  }, [accessToken, user, isInitialized, loadingProfile, pathname, router]);

  if (!isInitialized || loadingProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="relative w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-emerald-500/10 rounded-full"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
        <p className="mt-6 text-emerald-400 text-sm font-semibold tracking-wider animate-pulse">
          ĐANG KHỞI TẠO HỆ THỐNG...
        </p>
      </div>
    );
  }

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Prevent flash of protected content before redirect
  if (!accessToken && !isPublicRoute) {
    return null;
  }
  if (accessToken && user?.isFirstLogin && pathname !== '/first-login') {
    return null;
  }
  if (accessToken && !user?.isFirstLogin && (isPublicRoute || pathname === '/first-login')) {
    return null;
  }

  return <>{children}</>;
}
