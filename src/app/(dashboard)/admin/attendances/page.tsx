"use client"
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import * as faceapi from "face-api.js";

export default function FaceCheckInPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Dọn dẹp tài nguyên khi rời khỏi trang
  useEffect(() => {
    return () => {
      stopCamera();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // 1. Tải Model AI & Bật Camera
  const handleStartCamera = async () => {
    setIsLoadingAI(true);
    try {

      const MODEL_URL = '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setIsModelLoaded(true);

      // Bật camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOn(true);
    } catch (error: any) {
      console.error("Lỗi bật camera:", error);
      toast.error("Không thể bật Camera hoặc tải AI. Hãy kiểm tra quyền truy cập.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
  };

  // 2. Chạy nhận diện liên tục khi Video bắt đầu phát
  const handleVideoPlay = () => {
    if (!videoRef.current || !canvasRef.current || !isModelLoaded) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Bắt đầu vòng lặp vẽ khung
    intervalRef.current = setInterval(async () => {
      // Tránh lỗi nếu video đã bị tắt hoặc chưa có kích thước
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);

      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions()
      );

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
      }
    }, 100); // Quét mỗi 100ms
  };

  // 3. Xử lý Chụp ảnh & Gọi API Điểm danh
  const handleCheckIn = useCallback(async () => {
    if (!videoRef.current) return;

    setIsCheckingIn(true);

    // Tạo canvas tạm để chụp lại frame hiện tại của video
    const video = videoRef.current;
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;

    const ctx = captureCanvas.getContext("2d");
    if (!ctx) {
      toast.error("Lỗi khi xử lý hình ảnh");
      setIsCheckingIn(false);
      return;
    }

    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

    captureCanvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error("Lỗi: Không thể chụp ảnh từ camera");
        setIsCheckingIn(false);
        return;
      }

      const formData = new FormData();
      formData.append('image', blob, 'capture.jpg');
      // Nếu sau này API cần exam_schedule_id:
      // formData.append('exam_schedule_id', 'id_lịch_thi_nào_đó');

      const toastId = toast.loading("Đang xử lý khuôn mặt...");

      try {
        // Sử dụng api wrapper của bạn (thường đã cấu hình axios interceptors)
        const res = await api.post("/attendance-records/check-in", formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        // Hiển thị message từ BE trả về
        toast.success(res.data?.message || "Điểm danh thành công!", { id: toastId });

        // Nếu muốn xử lý thêm với thông tin sinh viên trả về, dùng: res.data.data

      } catch (err: any) {
        const msg = err.response?.data?.message || "Lỗi khi điểm danh";
        toast.error(Array.isArray(msg) ? msg.join(", ") : msg, { id: toastId });
      } finally {
        setIsCheckingIn(false);
      }
    }, 'image/jpeg', 0.9);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-medium text-slate-900 tracking-tight">
            Điểm danh nhận diện khuôn mặt
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Quét khuôn mặt để xác thực điểm danh tự động vào hệ thống.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden p-6">

        {(isCameraOn || isLoadingAI) && (
          <div className="flex justify-center mb-6 transition-all duration-500 ease-in-out">
            <div className="relative w-full max-w-2xl bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center shadow-inner">

              {/* Nếu đang tải, hiện chữ Loading */}
              {isLoadingAI && (
                <span className="absolute text-slate-300 font-medium z-10 flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang khởi động Camera và AI...
                </span>
              )}

              {/* Video và Canvas */}
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onPlay={handleVideoPlay}
                className={`w-full h-full object-cover ${!isCameraOn ? 'opacity-0' : 'opacity-100'}`}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Khu vực Buttons thao tác */}
        <div className="flex items-center justify-center gap-4 border-t border-slate-100 pt-6">
          {!isCameraOn ? (
            <Button
              variant="primary"
              size="lg"
              leftIcon="video" // Nếu Button UI của bạn hỗ trợ icon này
              loading={isLoadingAI}
              onClick={handleStartCamera}
            >
              Bật Camera & Tải AI
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="lg"
                onClick={stopCamera}
                disabled={isCheckingIn}
              >
                Tắt Camera
              </Button>

              <Button
                variant="primary"
                size="lg"
                leftIcon="check"
                loading={isCheckingIn}
                onClick={handleCheckIn}
              >
                Chụp ảnh & Điểm danh
              </Button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}