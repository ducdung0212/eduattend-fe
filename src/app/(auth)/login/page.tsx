"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login({ email, password });
    } catch (err: any) {
      // NestJS trả message dạng string hoặc string[]
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : (msg ?? "Email hoặc mật khẩu không đúng."));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 bg-slate-900 rounded-xl items-center justify-center mb-4">
            <span className="text-white text-xl font-bold">E</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">EduAttend</h1>
          <p className="mt-1 text-sm text-slate-500">Hệ thống điểm danh thông minh</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-8">
          <h2 className="text-base font-medium text-slate-900 mb-6">Đăng nhập</h2>

          {/* Error message từ backend */}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <i className="ti ti-alert-circle text-red-500 text-base mt-0.5 flex-shrink-0" aria-hidden="true" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              required
              leftIcon="mail"
              placeholder="example@edu.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
            />
            <Input
              label="Mật khẩu"
              type="password"
              required
              leftIcon="lock"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              Đăng nhập
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} EduAttend. All rights reserved.
        </p>
      </div>
    </div>
  );
}