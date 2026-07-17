import { AuthSession, LoginPayload, LoginFacePayload, LoginResponse, User } from '@/types';
import api from './api';

const COOKIE_EXPIRES_DAYS = 3;

/** Set cookie helper (không cần js-cookie) */
export function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

// ── Đăng nhập ────────────────────────────────────────────────
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data: resData } = await api.post<any>(
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

export async function loginFace(payload: LoginFacePayload): Promise<LoginResponse> {
  const { data: resData } = await api.post<any>(
    '/auth/login-face',
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
    setCookie('refresh_token', normalized.refreshToken, COOKIE_EXPIRES_DAYS);
    setCookie('user_role', normalized.user.role, COOKIE_EXPIRES_DAYS);
    setCookie('user_info', JSON.stringify(normalized.user), COOKIE_EXPIRES_DAYS);
  }

  return normalized;
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
  } catch (e) {
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
    admin: '/admin/users',
    lecturer: '/lecturer',
    student: '/student',
  };
  return map[role] ?? '/';
}