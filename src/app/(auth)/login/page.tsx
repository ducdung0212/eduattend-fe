"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ApiResponse, LoginResponse } from '@/types/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Gọi API login đã chuẩn hóa /api/v1/auth/login
      const res = await api.post<any, ApiResponse<LoginResponse>>('/auth/login', {
        email,
        password,
      });

      if (res.status === 200 && res.data) {
        localStorage.setItem('access_token', res.data.access_token);
        localStorage.setItem('user', JSON.stringify(res.data.user));

        // Chuyển hướng về dashboard sau khi Dũng đăng nhập thành công
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-slate-900">EduAttend</h1>
          <p className="mt-2 text-sm text-slate-600">Hệ thống điểm danh thông minh</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Email sinh viên/giảng viên</label>
              <input
                type="email"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Mật khẩu</label>
              <input
                type="password"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}