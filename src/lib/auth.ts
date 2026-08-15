import { AuthSession, LoginPayload, LoginResponse, User } from '@/types';
import api from './api';

import Cookies from 'js-cookie';

const COOKIE_EXPIRES_DAYS = 3;

/** Set cookie helper (sử dụng js-cookie) */
export function setCookie(name: string, value: string, days: number) {
  if (typeof window === 'undefined') return;
  Cookies.set(name, value, { expires: days, path: '/', sameSite: 'Lax' });
}

export function deleteCookie(name: string) {
  if (typeof window === 'undefined') return;
  Cookies.remove(name, { path: '/' });
}

export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return Cookies.get(name) ?? null;
}

// ── Đăng nhập ────────────────────────────────────────────────
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data: resData } = await api.post<{ data: { access_token: string; refresh_token: string; user: User } }>(
    '/auth/login',
    payload,
  );

  const data = resData.data;

  const normalized: LoginResponse = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: data.user,
  };

  if (typeof window !== 'undefined') {
    setCookie('access_token', normalized.accessToken, COOKIE_EXPIRES_DAYS);
    setCookie('refresh_token', normalized.refreshToken, COOKIE_EXPIRES_DAYS); // Lưu thêm refresh_token vào cookie
    setCookie('user_role', normalized.user.role, COOKIE_EXPIRES_DAYS);
    setCookie('user_info', JSON.stringify(normalized.user), COOKIE_EXPIRES_DAYS); // Lưu gọn info vào cookie thay vì localStorage
  }

  return normalized;
}


export async function createLivenessSession(): Promise<string> {
  const { data } = await api.post<{ data: { sessionId: string } }>('/auth/liveness-session');
  return data.data ? data.data.sessionId : (data as unknown as { sessionId: string }).sessionId;
}

export async function loginLiveness(sessionId: string): Promise<LoginResponse> {
  const { data: resData } = await api.post<{ data: { access_token: string; refresh_token: string; user: User } }>(
    '/auth/liveness-login',
    { sessionId },
  );

  const data = resData.data || (resData as any);

  const normalized: LoginResponse = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: data.user,
  };

  if (typeof window !== 'undefined') {
    setCookie('access_token', normalized.accessToken, COOKIE_EXPIRES_DAYS);
    setCookie('refresh_token', normalized.refreshToken, COOKIE_EXPIRES_DAYS);
    setCookie('user_role', normalized.user.role, COOKIE_EXPIRES_DAYS);
    setCookie('user_info', JSON.stringify(normalized.user), COOKIE_EXPIRES_DAYS);
  }

  return normalized;
}

export async function checkFaceLock(): Promise<{ isLocked: boolean; lockedUntil?: number }> {
  try {
    const { data } = await api.get(`/auth/check-face-lock?t=${Date.now()}`);
    return data.data || data;
  } catch {
    return { isLocked: false };
  }
}

// ── Đăng xuất ────────────────────────────────────────────────
export function logout(): void {
  deleteCookie('access_token');
  deleteCookie('refresh_token');
  deleteCookie('user_role');
  deleteCookie('user_info');
}

// ── Lấy session hiện tại (client-side) ───────────────────────
export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  const token = getCookie('access_token');
  const raw = getCookie('user_info');
  if (!token || !raw) return null;

  try {
    const user: User = JSON.parse(raw);
    return { user, accessToken: token };
  } catch {
    return null;
  }
}

// ── Lấy session hiện tại (server-side) ───────────────────────
export function parseJwt(token: string) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  } catch {
    return null;
  }
}

// ── Lấy user hiện tại ────────────────────────────────────────
export function getCurrentUser(): User | null {
  return getSession()?.user ?? null;
}

// ── Kiểm tra đã đăng nhập ────────────────────────────────────
export function isAuthenticated(): boolean {
  return getSession() !== null;
}

// ── Lấy redirect path sau khi login theo role ────────────────
export function getDefaultPath(role: string): string {
  const map: Record<string, string> = {
    admin: '/admin',
    lecturer: '/lecturer',
    student: '/student',
  };
  return map[role] ?? '/';
}