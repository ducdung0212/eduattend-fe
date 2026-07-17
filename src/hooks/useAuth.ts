'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, LoginPayload, LoginFacePayload } from '@/types';
import { login as loginApi, loginFace as loginFaceApi, logout as logoutApi, getCurrentUser, getDefaultPath } from '@/lib/auth';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;       // true chỉ khi đang gọi API login
  initializing: boolean;  // true khi đang đọc session lần đầu
  login: (payload: LoginPayload) => Promise<void>;
  loginFace: (payload: LoginFacePayload) => Promise<void>;
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
    setUser(current);
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

  const loginFace = useCallback(async (payload: LoginFacePayload) => {
    setLoading(true);
    try {
      const res = await loginFaceApi(payload);
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
    loginFace,
    logout,
    isAuthenticated: user !== null,
  };
}