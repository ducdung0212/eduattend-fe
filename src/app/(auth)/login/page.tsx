"use client";
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { checkFaceLock } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useFaceDetectionCamera } from "@/hooks/useFaceDetectionCamera";

export default function LoginPage() {
  const { login, loginFace, loading } = useAuth();
  const [loginMethod, setLoginMethod] = useState<"password" | "face">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [failedFaceCount, setFailedFaceCount] = useState(0);
  const [lockTimeLeft, setLockTimeLeft] = useState<number | null>(null);
  const [isCheckingLock, setIsCheckingLock] = useState(true); // Chờ kiểm tra khóa trước khi bật camera
  
  const {
    videoRef,
    canvasRef,
    isCameraOn,
    isLoadingAI,
    faceCount,
    error: cameraError,
    startCamera,
    stopCamera,
    handleVideoPlay,
    detectFacesCurrentFrame,
    captureFullFrame
  } = useFaceDetectionCamera("user");

  const isLockedUI = failedFaceCount >= 3;

  useEffect(() => {
    if (loginMethod !== "face" || isLockedUI || isCheckingLock) {
      stopCamera();
    } else {
      startCamera();
    }
    return () => stopCamera();
  }, [loginMethod, isLockedUI, isCheckingLock, startCamera, stopCamera]);

  useEffect(() => {
    if (cameraError) {
      setError(cameraError);
    }
  }, [cameraError]);

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

  const handleFaceLogin = useCallback(async () => {
    setError("");
    const detections = detectFacesCurrentFrame();
    
    if (detections.length === 0) {
        setError("Không nhận diện được khuôn mặt nào. Vui lòng nhìn thẳng vào camera.");
        return;
    }
    if (detections.length > 1) {
        setError(`Phát hiện ${detections.length} khuôn mặt. Vui lòng đảm bảo chỉ có 1 người trong khung hình.`);
        return;
    }

    const captureCanvas = captureFullFrame();
    if (!captureCanvas) return;
    
    const imageBase64 = captureCanvas.toDataURL("image/jpeg", 0.9);
    
    try {
      await loginFace({ imageBase64 });
      setFailedFaceCount(0);
      localStorage.removeItem("faceLoginLockTime");
    } catch (err: any) {
      const isLocked = err?.response?.status === 429;
      
      setFailedFaceCount(prev => {
        const next = isLocked ? 3 : prev + 1;
        if (next >= 3) {
          const lockedUntilFromBE = err?.response?.data?.data?.lockedUntil || err?.response?.data?.lockedUntil;
          const lockedUntil = lockedUntilFromBE || (Date.now() + 60 * 60 * 1000); // fallback to 1 hour
          localStorage.setItem("faceLoginLockTime", lockedUntil.toString());
        }
        return next;
      });
      
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : (msg ?? "Xác thực khuôn mặt thất bại."));
    }
  }, [detectFacesCurrentFrame, captureFullFrame, loginFace]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 bg-slate-900 rounded-xl items-center justify-center mb-4">
            <span className="text-white text-xl font-bold">E</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">EduAttend</h1>
          <p className="mt-1 text-sm text-slate-500">Hệ thống điểm danh thông minh</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-8">
          
          <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
            <button
              onClick={() => setLoginMethod("password")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                loginMethod === "password"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Mật khẩu
            </button>
            <button
              onClick={() => setLoginMethod("face")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                loginMethod === "face"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
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
            <div className="space-y-4 flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <i className="ti ti-lock text-3xl text-red-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Khóa đăng nhập khuôn mặt</h3>
              <p className="text-sm text-slate-500 text-center px-4">
                Bạn đã nhập sai 3 lần. Chức năng đăng nhập bằng khuôn mặt đã bị khóa để bảo mật.
                {lockTimeLeft !== null && (
                  <span className="font-semibold text-red-600 mt-2 block">
                    Vui lòng thử lại sau: {formatTimeLeft(lockTimeLeft)}
                  </span>
                )}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-4"
                onClick={() => setLoginMethod("password")}
              >
                Đăng nhập bằng mật khẩu
              </Button>
            </div>
          ) : (
            <div className="space-y-4 flex flex-col items-center">
              <div className="w-full rounded-xl overflow-hidden border-2 border-slate-200 aspect-video relative bg-black flex items-center justify-center">
                {isLoadingAI && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                        <span className="w-8 h-8 rounded-full border-[3px] border-slate-600 border-t-blue-400 animate-spin mb-3" />
                        <span className="text-slate-300 text-sm font-medium">Đang tải AI...</span>
                    </div>
                )}
                
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    onPlay={handleVideoPlay}
                    className={`w-full h-full object-cover transition-opacity ${!isCameraOn ? "opacity-0" : (loading ? "opacity-50" : "opacity-100")}`}
                    style={{ transform: "scaleX(-1)" }} 
                />
                <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
                    style={{ transform: "scaleX(-1)" }} 
                />
                
                {isCameraOn && !loading && (
                    <div className="absolute top-2 left-2 z-30">
                        {faceCount === 1 ? (
                            <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                1 Khuôn mặt (Hợp lệ)
                            </span>
                        ) : faceCount > 1 ? (
                            <span className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                {faceCount} Khuôn mặt (Không hợp lệ)
                            </span>
                        ) : (
                            <span className="bg-amber-500/90 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                Chưa thấy khuôn mặt
                            </span>
                        )}
                    </div>
                )}
              </div>
              <p className="text-sm text-slate-500 text-center">
                Vui lòng đưa 1 khuôn mặt lại gần camera để đăng nhập.
              </p>
              <Button
                type="button"
                variant="primary"
                size="lg"
                loading={loading}
                onClick={handleFaceLogin}
                className="w-full mt-2 shadow-md"
                disabled={!isCameraOn || isLoadingAI || faceCount !== 1}
              >
                Quét khuôn mặt
              </Button>
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