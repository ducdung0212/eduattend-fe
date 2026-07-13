"use client";

import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import { formatTime, todayString } from "@/lib/utils";
import { ExamSchedule } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import * as faceapi from "face-api.js";
import { Modal } from "@/components/ui/Modal";
import { SearchBar } from "./SearchBar";

interface Props {
    open: boolean;
    schedule: ExamSchedule;
    onClose: () => void;
    onSuccess?: () => void;
}

interface CheckInResult {
    id: string;
    student_code: string;
    student_name: string;
    confidence: number;
    time: string;
    success: boolean;
    message: string;
    alreadyCheckedIn?: boolean;
}

export function CheckInCameraView({ open, schedule, onClose, onSuccess }: Props) {

    // ── Tìm kiếm SV trong ngày ──────────────────────
    const [studentSearch, setStudentSearch] = useState("");
    const [studentSearchResults, setStudentSearchResults] = useState<ExamSchedule[]>([]);
    const [searchingStudent, setSearchingStudent] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isLoadingAI, setIsLoadingAI] = useState(true);
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [results, setResults] = useState<CheckInResult[]>([]);
    const [faceCount, setFaceCount] = useState(0);
    const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

    const startStr = formatTime(schedule.start_time);
    const endDate = new Date(new Date(schedule.start_time).getTime() + (schedule.duration ?? 120) * 60000);
    const endStr = formatTime(endDate);

    useEffect(() => {
        if (!studentSearch.trim()) {
            setStudentSearchResults([]);
            return;
        }
        const t = setTimeout(async () => {
            setSearchingStudent(true);
            try {
                const today = todayString();
                const res = await api.get("/exam-schedules", {
                    params: {
                        start_time: today,
                        search: studentSearch,
                        limit: 50,
                    },
                });
                setStudentSearchResults(res.data?.data ?? []);
            } catch {
                console.error("Lỗi khi tìm kiếm sinh viên");
            } finally {
                setSearchingStudent(false);
            }
        }, 400);
        return () => clearTimeout(t);
    }, [studentSearch]);

    // Bật camera khi modal mở
    useEffect(() => {
        if (open) {
            startCamera(facingMode);
        } else {
            stopCamera();
            setResults([]);
        }
        return () => {
            stopCamera();
        };
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    

    const startCamera = async (currentFacingMode: "environment" | "user" = facingMode) => {
        setIsLoadingAI(true);
        try {
            // Tải model AI
            const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
            // Sử dụng SSD Mobilenet V1 cho độ chính xác cao khi quét nhiều mặt ở khoảng cách xa
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            setIsModelLoaded(true);

            // Bật camera
            const stream = await navigator.mediaDevices.getUserMedia({
                // Giảm resolution xuống 720p (tối ưu cho điện thoại)
                video: { facingMode: currentFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsCameraOn(true);
        } catch (error) {
            console.error("Lỗi bật camera:", error);
            toast.error("Không thể bật Camera hoặc tải AI. Hãy kiểm tra quyền truy cập.");
        } finally {
            setIsLoadingAI(false);
        }
    };

    const stopCamera = () => {
        if (intervalRef.current) {
            clearTimeout(intervalRef.current);
            intervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setIsCameraOn(false);
    };

    // Face detection loop
    const handleVideoPlay = () => {
        if (!videoRef.current || !canvasRef.current || !isModelLoaded) return;

        if (intervalRef.current) {
            clearTimeout(intervalRef.current);
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;

        const detectLoop = async () => {
            if (video.paused || video.ended) return;

            if (video.videoWidth > 0 && video.videoHeight > 0) {
                const displaySize = { width: video.videoWidth, height: video.videoHeight };
                faceapi.matchDimensions(canvas, displaySize);

                try {
                    const detections = await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }));
                    setFaceCount(detections.length);

                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    const ctx = canvas.getContext("2d");

                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        // Vẽ custom detection boxes với màu xanh lá
                        resizedDetections.forEach((det) => {
                            const { x, y, width, height } = det.box;
                            ctx.strokeStyle = "#22c55e";
                            ctx.lineWidth = 2.5;
                            ctx.strokeRect(x, y, width, height);

                            // Label
                            ctx.fillStyle = "rgba(34, 197, 94, 0.85)";
                            ctx.fillRect(x, y - 20, 80, 20);
                            ctx.fillStyle = "#fff";
                            ctx.font = "bold 11px Inter, sans-serif";
                            ctx.fillText(`Face ${(det.score * 100).toFixed(0)}%`, x + 4, y - 6);
                        });
                    }
                } catch (e) {
                    console.error("Detect error:", e);
                }
            }

            // Chạy frame tiếp theo một cách tuần tự sau khi frame trước kết thúc
            // Sử dụng setTimeout 100ms kết hợp requestAnimationFrame để không làm đơ UI trên điện thoại
            intervalRef.current = setTimeout(() => {
                requestAnimationFrame(detectLoop);
            }, 100);
        };

        detectLoop();
    };

    

    // Chụp ảnh & Điểm danh (hỗ trợ multi-face bằng cách crop)
    const handleCheckIn = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        setIsCheckingIn(true);
        setResults([]); // Xoá kết quả cũ trước khi điểm danh lượt mới

        const video = videoRef.current;
        video.pause(); // Freeze the camera frame

        try {
            // Phát hiện tất cả faces với SSD Mobilenet V1
            const detections = await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }));

            if (detections.length === 0) {
                toast.error("Không phát hiện được khuôn mặt nào trong khung hình");
                setIsCheckingIn(false);
                return;
            }

            // Nếu chỉ có 1 face → gửi toàn bộ ảnh
            // Nếu nhiều face → crop từng face ra và gửi song song
            const requests: Promise<void>[] = [];

            if (detections.length === 1) {
                // Gửi toàn bộ frame
                const captureCanvas = document.createElement("canvas");
                captureCanvas.width = video.videoWidth;
                captureCanvas.height = video.videoHeight;
                const ctx = captureCanvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(video, 0, 0);
                    requests.push(sendCheckIn(captureCanvas));
                }
            } else {
                // Crop từng face
                for (const det of detections) {
                    const { x, y, width, height } = det.box;
                    // Mở rộng vùng crop để bao gồm cả khuôn mặt
                    const padding = Math.max(width, height) * 0.4;
                    const cx = Math.max(0, x - padding);
                    const cy = Math.max(0, y - padding);
                    const cw = Math.min(video.videoWidth - cx, width + padding * 2);
                    const ch = Math.min(video.videoHeight - cy, height + padding * 2);

                    const cropCanvas = document.createElement("canvas");
                    cropCanvas.width = cw;
                    cropCanvas.height = ch;
                    const ctx = cropCanvas.getContext("2d");
                    if (ctx) {
                        ctx.drawImage(video, cx, cy, cw, ch, 0, 0, cw, ch);
                        requests.push(sendCheckIn(cropCanvas));
                    }
                }
            }

            await Promise.allSettled(requests);
        } catch (err) {
            console.error("Lỗi khi điểm danh:", err);
            toast.error("Có lỗi xảy ra khi xử lý điểm danh");
        } finally {
            setIsCheckingIn(false);
            if (videoRef.current) {
                videoRef.current.play().catch(e => console.error("Cannot resume video", e));
            }
        }
    }, [schedule.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const sendCheckIn = async (canvas: HTMLCanvasElement) => {
        return new Promise<void>((resolve) => {
            canvas.toBlob(
                async (blob) => {
                    if (!blob) {
                        addResult({
                            success: false,
                            message: "Không thể chụp ảnh",
                            student_code: "",
                            student_name: "",
                            confidence: 0,
                        });
                        resolve();
                        return;
                    }

                    const formData = new FormData();
                    formData.append("image", blob, "capture.jpg");
                    formData.append("exam_schedule_id", schedule.id);

                    try {
                        const res = await api.post(`/attendance-records/check-in?exam_schedule_id=${schedule.id}`, formData, {
                            headers: { "Content-Type": "multipart/form-data" },
                        });

                        const data = res.data?.data;
                        const student = data?.existingStudent;
                        const msg = res.data?.message || "Điểm danh thành công";

                        addResult({
                            success: true,
                            message: msg,
                            student_code: student?.student_code || "",
                            student_name: `${student?.last_name || ""} ${student?.first_name || ""}`.trim(),
                            confidence: data?.confidence || 0,
                            alreadyCheckedIn: data?.alreadyCheckedIn,
                        });
                        
                        if (!data?.alreadyCheckedIn) {
                            onSuccess?.();
                        }
                    } catch (err: any) {
                        const msg = err.response?.data?.message || "Lỗi khi điểm danh";
                        const errMsg = Array.isArray(msg) ? msg.join(", ") : msg;

                        addResult({
                            success: false,
                            message: errMsg,
                            student_code: "",
                            student_name: "",
                            confidence: 0,
                        });
                    } finally {
                        resolve();
                    }
                },
                "image/jpeg",
                0.9
            );
        });
    };

    const addResult = (data: Omit<CheckInResult, "id" | "time">) => {
        const result: CheckInResult = {
            ...data,
            id: crypto.randomUUID(),
            time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        };
        setResults((prev) => [result, ...prev]);
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Điểm danh: ${schedule.subject?.name}`}
            size="lg"
        >
            <div className="space-y-4">
                {/* Thông tin phụ */}
                <div className="flex items-center justify-between pb-2">
                    <p className="text-xs text-slate-500">
                        {schedule.subject?.subject_code} · Nhóm {schedule.group} · Phòng {schedule.room?.name} · {startStr} – {endStr}
                    </p>
                    {faceCount > 0 && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {faceCount} khuôn mặt
                        </span>
                    )}
                </div>

            {/* Camera */}
            <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
                <div className="relative w-full bg-black aspect-video flex items-center justify-center">
                    {isLoadingAI && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                            <span className="w-10 h-10 rounded-full border-[3px] border-slate-600 border-t-blue-400 animate-spin mb-3" />
                            <span className="text-slate-300 text-sm font-medium">Đang khởi động Camera và AI...</span>
                        </div>
                    )}

                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        onPlay={handleVideoPlay}
                        className={`w-full h-full object-cover ${!isCameraOn ? "opacity-0" : "opacity-100"} transition-opacity`}
                    />
                    <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
                    />
                </div>

                {/* Tìm kiếm SV trong ngày */}
                <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                        <i className="ti ti-search text-violet-600" />
                        <h4 className="text-sm font-semibold text-slate-900">Tra cứu sinh viên trong ngày</h4>
                    </div>
                    <div className="p-4 space-y-3">
                        <SearchBar
                            value={studentSearch}
                            onChange={setStudentSearch}
                            placeholder="Nhập mã SV hoặc tên để xem thuộc ca thi nào..."
                            className="max-w-full"
                        />

                        {searchingStudent && (
                            <div className="text-sm text-slate-400 text-center py-2 flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                                Đang tìm kiếm...
                            </div>
                        )}

                        {!searchingStudent && studentSearch.trim() && studentSearchResults.length === 0 && (
                            <div className="text-sm text-slate-400 text-center py-2">
                                Không tìm thấy kết quả cho "{studentSearch}"
                            </div>
                        )}

                        {studentSearchResults.length > 0 && (
                            <div className="space-y-2">
                                {studentSearchResults.map((s) => {
                                    const sStart = formatTime(s.start_time);
                                    const sEnd = formatTime(new Date(new Date(s.start_time).getTime() + (s.duration ?? 120) * 60000));
                                    return (
                                        <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100 text-sm">
                                            <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
                                                <i className="ti ti-book text-violet-600 text-sm" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-slate-900 truncate">{s.subject?.name}</div>
                                                <div className="text-xs text-slate-500">
                                                    {s.subject?.subject_code} · Nhóm {s.group} · Phòng {s.room?.name} · {sStart} – {sEnd}
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                                {s.attendance_count ?? 0} SV
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Nút chụp */}
                <div className="flex items-center justify-center gap-3 px-4 py-4 border-t border-slate-100">
                    <Button
                        variant="primary"
                        size="lg"
                        leftIcon="camera"
                        loading={isCheckingIn}
                        disabled={!isCameraOn || isLoadingAI}
                        onClick={handleCheckIn}
                        className="px-8"
                    >
                        Chụp ảnh & Điểm danh
                    </Button>

                    {isCameraOn && (
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={() => {
                                const newMode = facingMode === "environment" ? "user" : "environment";
                                setFacingMode(newMode);
                                stopCamera();
                                startCamera(newMode);
                            }}
                            disabled={isCheckingIn}
                        >
                            <i className="ti ti-refresh text-base" />
                        </Button>
                    )}
                </div>
            </div>

                {/* Kết quả điểm danh hiển thị ngay dưới camera */}
                {results.length > 0 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
                        {results.map((r) => {
                            let bgColor = "bg-red-50 border-red-200";
                            let iconColor = "text-red-600 bg-red-100";
                            let iconName = "ti-x";
                            
                            if (r.success) {
                                if (r.alreadyCheckedIn) {
                                    bgColor = "bg-amber-50 border-amber-200";
                                    iconColor = "text-amber-600 bg-amber-100";
                                    iconName = "ti-info-circle";
                                } else {
                                    bgColor = "bg-emerald-50 border-emerald-200";
                                    iconColor = "text-emerald-600 bg-emerald-100";
                                    iconName = "ti-check";
                                }
                            }

                            return (
                                <div key={r.id} className={`flex items-start gap-3 p-3 rounded-lg border ${bgColor}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
                                        <i className={`ti ${iconName} text-lg`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-slate-900">
                                            {r.success && r.student_code ? (
                                                <>{r.student_code} — {r.student_name}</>
                                            ) : (
                                                "Lỗi nhận diện"
                                            )}
                                        </div>
                                        <div className={`text-sm mt-0.5 ${!r.success ? 'text-red-700' : (r.alreadyCheckedIn ? 'text-amber-700 font-medium' : 'text-emerald-700')}`}>
                                            {r.message}
                                        </div>
                                        {r.success && !r.alreadyCheckedIn && (
                                            <div className="text-[11px] text-slate-500 mt-1">
                                                Độ tin cậy: {r.confidence.toFixed(1)}%
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}
