import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getCookie, setCookie, deleteCookie } from './auth';

/**
 * Tất cả request đều có prefix /api/v1
 * Ví dụ: api.post('/auth/login') → POST http://localhost:3001/api/v1/auth/login
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: đính kèm accessToken ───────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = getCookie('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response: xử lý lỗi 401 → refresh token ─────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  pendingQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Không tự động refresh token nếu đó là request login
    if (original.url === '/auth/login') {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getCookie('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        // Dùng api instance (baseURL lấy từ NEXT_PUBLIC_API_URL trong .env)
        const { data } = await api.post('/auth/refresh', {
          refresh_token: refreshToken,
        });
        const newToken: string = data.data?.access_token ?? data.accessToken;

        setCookie('access_token', newToken, 3);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        deleteCookie('access_token');
        deleteCookie('refresh_token');
        deleteCookie('user_role');
        deleteCookie('user_info');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;