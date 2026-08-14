'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, LoginPayload } from '@/types';
import { login as loginApi, logout as logoutApi, getCurrentUser, getDefaultPath } from '@/lib/auth';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;       // true chỉ khi đang gọi API login
  initializing: boolean;  // true khi đang đọc session lần đầu
  login: (payload: LoginPayload) => Promise<void>;
  loginLiveness: (sessionId: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);       // ★ false mặc định — không block UI
  const [initializing, setInitializing] = useState(true);

  // Đọc session từ localStorage khi component mount
  useEffect(() => {
    const current = getCurrentUser();
    // eslint-disable-next-line
    setUser(current);
    // eslint-disable-next-line
    setInitializing(false);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setLoading(true);
    try {
      const res = await loginApi(payload);
      setUser(res.user);
      // Redirect về đúng dashboard theo role
      router.push(getDefaultPath(res.user.role));
    } finally {
      setLoading(false);
    }
  }, [router]);


  const loginLiveness = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const { loginLiveness: loginLivenessApi } = await import('@/lib/auth');
      const res = await loginLivenessApi(sessionId);
      setUser(res.user);
      router.push(getDefaultPath(res.user.role));
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = useCallback(() => {
    logoutApi();
    setUser(null);
    router.push('/login');
  }, [router]);

  return {
    user,
    loading,
    initializing,
    login,
    loginLiveness,
    logout,
    isAuthenticated: user !== null,
  };
}