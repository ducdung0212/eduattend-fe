"use client";

import { useState, useRef, useCallback } from "react";
import { FaceDetector, FilesetResolver, Detection } from "@mediapipe/tasks-vision";

export function useFaceDetectionCamera(initialFacingMode: "user" | "environment" = "user") {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const streamRef = useRef<MediaStream | null>(null);
    const detectorRef = useRef<FaceDetector | null>(null);
    const detectCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const videoFrameRef = useRef<number | null>(null);
    const lastVideoTimeRef = useRef<number>(-1);

    const getValidTimestamp = useCallback(() => {
        let ts = performance.now();
        if (ts <= lastVideoTimeRef.current) {
            ts = lastVideoTimeRef.current + 1;
        }
        lastVideoTimeRef.current = ts;
        return ts;
    }, []);

    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [faceCount, setFaceCount] = useState(0);
    const [error, setError] = useState("");
    const [facingMode, setFacingMode] = useState<"user" | "environment">(initialFacingMode);

    const startCamera = useCallback(async (mode: "user" | "environment" = facingMode) => {
        setIsLoadingAI(true);
        setError("");
        try {
            if (!detectorRef.current) {
                const vision = await FilesetResolver.forVisionTasks("/wasm");
                let detector: FaceDetector;
                try {
                    detector = await FaceDetector.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: "/models/blaze_face_full_range.tflite",
                            delegate: "GPU"
                        },
                        runningMode: "VIDEO",
                        minDetectionConfidence: 0.4
                    });
                } catch {
                    detector = await FaceDetector.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: "/models/blaze_face_full_range.tflite",
                            delegate: "CPU"
                        },
                        runningMode: "VIDEO",
                        minDetectionConfidence: 0.4
                    });
                }
                detectorRef.current = detector;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } },
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setFacingMode(mode);
            setIsCameraOn(true);
        } catch (err) {
            console.error("Camera/AI Error:", err);
            setError("Không thể bật camera hoặc AI. Hãy kiểm tra quyền truy cập.");
        } finally {
            setIsLoadingAI(false);
        }
    }, [facingMode]);

    const stopCamera = useCallback(() => {
        if (videoFrameRef.current && videoRef.current && 'cancelVideoFrameCallback' in videoRef.current) {
            videoRef.current.cancelVideoFrameCallback(videoFrameRef.current);
            videoFrameRef.current = null;
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (detectorRef.current) {
            detectorRef.current.close();
            detectorRef.current = null;
        }
        setIsCameraOn(false);
        setFaceCount(0);
    }, []);

    const switchCamera = useCallback(() => {
        const newMode = facingMode === "environment" ? "user" : "environment";
        stopCamera();
        startCamera(newMode);
    }, [facingMode, startCamera, stopCamera]);

    const handleVideoPlay = useCallback(() => {
        if (!videoRef.current || !canvasRef.current || !detectorRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        if (!detectCanvasRef.current) {
            detectCanvasRef.current = document.createElement("canvas");
        }

        let lastDetectionTime = 0;

        const detectLoop = (now: number = performance.now()) => {
            if (video.paused || video.ended || !detectorRef.current) return;

            if (now - lastDetectionTime >= 100) { // Limit to 10fps
                lastDetectionTime = now;

                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }
                
                if (detectCanvasRef.current!.width !== video.videoWidth || detectCanvasRef.current!.height !== video.videoHeight) {
                    detectCanvasRef.current!.width = video.videoWidth;
                    detectCanvasRef.current!.height = video.videoHeight;
                }

                try {
                    const dctx = detectCanvasRef.current!.getContext("2d")!;
                    dctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

                    const ts = getValidTimestamp();
                    const result = detectorRef.current.detectForVideo(detectCanvasRef.current!, ts);
                    const detections = result.detections;
                    setFaceCount(detections.length);

                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        const scaleX = 1;
                        const scaleY = 1;

                        detections.forEach((det) => {
                            if (!det.boundingBox) return;
                            const { originX, originY, width, height } = det.boundingBox;
                            
                            // Model full_range trả về bounding box bao toàn bộ vùng đầu khá to
                            // Thu nhỏ 15% mỗi cạnh để khung xanh lá cây bám sát khuôn mặt hơn (UI đẹp hơn)
                            const shrinkX = width * 0.15;
                            const shrinkY = height * 0.15;
                            
                            const x = (originX + shrinkX) * scaleX;
                            const y = (originY + shrinkY) * scaleY;
                            const w = (width - shrinkX * 2) * scaleX;
                            const h = (height - shrinkY * 2) * scaleY;

                            ctx.strokeStyle = "#22c55e";
                            ctx.lineWidth = 3;
                            ctx.strokeRect(x, y, w, h);

                            // Label for environment mode usually
                            if (facingMode === "environment") {
                                ctx.fillStyle = "rgba(34, 197, 94, 0.85)";
                                ctx.fillRect(x, y - 20, 80, 20);
                                ctx.fillStyle = "#fff";
                                ctx.font = "bold 11px Inter, sans-serif";
                                const score = det.categories[0]?.score ?? 0;
                                ctx.fillText(`Face ${(score * 100).toFixed(0)}%`, x + 4, y - 6);
                            }
                        });
                    }
                } catch (e) {
                    console.error("Detect error:", e);
                }
            }

            if ('requestVideoFrameCallback' in video) {
                videoFrameRef.current = video.requestVideoFrameCallback(detectLoop);
            } else {
                animationFrameRef.current = requestAnimationFrame(() => detectLoop(performance.now()));
            }
        };

        if ('requestVideoFrameCallback' in video) {
            videoFrameRef.current = video.requestVideoFrameCallback(detectLoop);
        } else {
            animationFrameRef.current = requestAnimationFrame(() => detectLoop(performance.now()));
        }
    }, [facingMode, getValidTimestamp]);

    const detectFacesCurrentFrame = useCallback((): Detection[] => {
        if (!videoRef.current || !detectorRef.current) return [];
        const ts = getValidTimestamp();
        const result = detectorRef.current.detectForVideo(videoRef.current, ts);
        return result.detections;
    }, [getValidTimestamp]);

    const captureFullFrame = useCallback((): HTMLCanvasElement | null => {
        if (!videoRef.current) return null;
        const video = videoRef.current;
        const captureCanvas = document.createElement("canvas");
        captureCanvas.width = video.videoWidth;
        captureCanvas.height = video.videoHeight;
        const ctx = captureCanvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0);
        return captureCanvas;
    }, []);

    return {
        videoRef,
        canvasRef,
        isCameraOn,
        isLoadingAI,
        faceCount,
        error,
        facingMode,
        startCamera,
        stopCamera,
        switchCamera,
        handleVideoPlay,
        detectFacesCurrentFrame,
        captureFullFrame
    };
}
