"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { checkFaceLock } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LecturerLivenessLogin } from "@/components/LecturerLivenessLogin";

export default function LoginPage() {
  const { login, loginLiveness, loading } = useAuth();
  const [loginMethod, setLoginMethod] = useState<"password" | "face">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [failedFaceCount, setFailedFaceCount] = useState(0);
  const [lockTimeLeft, setLockTimeLeft] = useState<number | null>(null);
  const [isCheckingLock, setIsCheckingLock] = useState(true);

  const isLockedUI = failedFaceCount >= 3;

  useEffect(() => {
    if (failedFaceCount >= 3) {
      const updateTimer = () => {
        const lockTimeStr = localStorage.getItem("faceLoginLockTime");
        if (lockTimeStr) {
          const lockTime = parseInt(lockTimeStr, 10);
          const diff = lockTime - Date.now();
          if (diff > 0) {
            setLockTimeLeft(diff);
          } else {
             setLockTimeLeft(null);
             setFailedFaceCount(0);
             localStorage.removeItem("faceLoginLockTime");
          }
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setLockTimeLeft(null);
    }
  }, [failedFaceCount]);

  const formatTimeLeft = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m} phút ${s} giây`;
  };

  useEffect(() => {
    let isMounted = true;
    setIsCheckingLock(true);
    
    const lockTime = localStorage.getItem("faceLoginLockTime");
    if (lockTime && parseInt(lockTime, 10) > Date.now()) {
      setFailedFaceCount(3);
      setIsCheckingLock(false);
      return;
    } else if (lockTime) {
      localStorage.removeItem("faceLoginLockTime");
    }

    const verifyLockOnServer = async () => {
      try {
        const res = await checkFaceLock();
        if (isMounted && res.isLocked && res.lockedUntil) {
          setFailedFaceCount(3);
          localStorage.setItem("faceLoginLockTime", res.lockedUntil.toString());
        }
      } finally {
        if (isMounted) {
          setIsCheckingLock(false);
        }
      }
    };
    
    verifyLockOnServer();
    
    return () => { isMounted = false; };
  }, []);

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login({ email, password });
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : (msg ?? "Email hoặc mật khẩu không đúng."));
    }
  };

  const handleLivenessComplete = async (sessionId: string) => {
    setError("");
    try {
      await loginLiveness(sessionId);
      setFailedFaceCount(0);
      localStorage.removeItem("faceLoginLockTime");
    } catch (err: any) {
      const isLocked = err?.response?.status === 429;

      setFailedFaceCount((prev) => {
        const next = isLocked ? 3 : prev + 1;
        if (next >= 3) {
          const lockedUntilFromBE =
            err?.response?.data?.data?.lockedUntil || err?.response?.data?.lockedUntil;
          const lockedUntil = lockedUntilFromBE || Date.now() + 60 * 60 * 1000;
          localStorage.setItem("faceLoginLockTime", lockedUntil.toString());
        }
        return next;
      });

      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : (msg ?? "Xác thực khuôn mặt thất bại."));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className={`w-full transition-[max-width] duration-200 ${loginMethod === "face" ? "max-w-md sm:max-w-lg" : "max-w-md"}`}>

        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 bg-slate-900 rounded-xl items-center justify-center mb-4">
            <span className="text-white text-xl font-bold">E</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">EduAttend</h1>
          <p className="mt-1 text-sm text-slate-500">Hệ thống điểm danh thông minh</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 sm:p-8">
          
          <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => { setLoginMethod("password"); setError(""); }}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-colors ${
                loginMethod === "password"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <i className="ti ti-key text-base" aria-hidden="true" />
              Mật khẩu
            </button>
            <button
              onClick={() => { setLoginMethod("face"); setError(""); }}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-colors ${
                loginMethod === "face"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <i className="ti ti-scan text-base" aria-hidden="true" />
              Khuôn mặt
            </button>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <i className="ti ti-alert-circle text-red-500 text-base mt-0.5 flex-shrink-0" aria-hidden="true" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loginMethod === "password" ? (
            <form onSubmit={handleSubmitPassword} className="space-y-4">
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
          ) : isLockedUI ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-10 text-center">
              <div className="mb-1 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <i className="ti ti-lock text-3xl text-red-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Khóa đăng nhập khuôn mặt</h3>
              <p className="text-sm text-slate-500">
                Bạn đã nhập sai quá nhiều lần. Chức năng đăng nhập bằng khuôn mặt đã bị khóa để bảo mật.
              </p>
              {lockTimeLeft !== null && (
                <span className="block font-semibold text-red-600">
                  Vui lòng thử lại sau: {formatTimeLeft(lockTimeLeft)}
                </span>
              )}
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                onClick={() => setLoginMethod("password")}
              >
                Đăng nhập bằng mật khẩu
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {isCheckingLock ? (
                <div className="flex w-full max-w-[420px] flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 py-12">
                  <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-slate-200 border-t-emerald-500" />
                  <p className="text-sm text-slate-500">Đang kiểm tra bảo mật...</p>
                </div>
              ) : loading ? (
                <div className="flex w-full max-w-[420px] flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 py-12">
                  <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-emerald-500" />
                  <p className="text-sm text-slate-500">Đang đăng nhập...</p>
                </div>
              ) : (
                <LecturerLivenessLogin
                  key={`liveness-retry-${failedFaceCount}`}
                  onLivenessComplete={handleLivenessComplete}
                  onLivenessError={(err) => setError(err)}
                  onCancel={() => setLoginMethod("password")}
                />
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} EduAttend. All rights reserved.
        </p>
      </div>
    </div>
  );
}