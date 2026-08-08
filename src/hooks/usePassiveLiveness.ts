"use client";

import { useCallback } from "react";
import { FaceLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";

// ─── Cấu hình threshold (có thể tune) ────────────────────────────────────────
const LIVENESS_CONFIG = {
  FRAME_COUNT: 5,          // Số frame cần chụp
  FRAME_INTERVAL_MS: 300,  // Khoảng cách giữa mỗi frame (ms)
  // Threshold cho từng layer
  PIXEL_MSE_THRESHOLD: 8,      // MSE trung bình > ngưỡng này → có chuyển động
  EAR_STD_THRESHOLD: 0.008,    // EAR std dev > ngưỡng → có chớp mắt
  HEAD_POSE_THRESHOLD: 0.15,   // Head pose variance > ngưỡng → có micro-movement
  // Layer 4: Rigid Motion — phát hiện ảnh tĩnh bị di chuyển
  // Khi di chuyển ảnh, tất cả landmarks dịch chuyển cùng hướng, cùng khoảng cách
  // → "độ đồng đều" (uniformity) rất cao. Người thật thì landmarks di chuyển
  // độc lập (mắt chớp, môi động) → uniformity thấp hơn.
  RIGID_UNIFORMITY_THRESHOLD: 0.92, // Nếu uniformity > ngưỡng → rigid motion → FAKE
  RIGID_MIN_MOVEMENT: 0.002,        // Bỏ qua rigid check nếu movement quá nhỏ (đứng yên tự nhiên)
  MIN_LAYERS_PASS: 2,          // Cần pass ít nhất 2/3 layer soft (NGOÀI rigid check)
};

// ─── Kết quả liveness check ──────────────────────────────────────────────────
export interface LivenessResult {
  isLive: boolean;
  scores: {
    pixelMSE: number;
    earStd: number;
    headPoseVariance: number;
    rigidUniformity: number;
  };
  passedLayers: number;
  rigidMotionDetected: boolean;
  reason?: string;
}

// ─── MediaPipe Face Landmark indices ─────────────────────────────────────────
// Mắt trái (theo chuẩn MediaPipe 468 landmarks)
const LEFT_EYE_TOP = [159, 145]; // Trên-dưới mắt trái  
const LEFT_EYE_OUTER = [33, 133]; // Góc ngoài-trong mắt trái
// Mắt phải
const RIGHT_EYE_TOP = [386, 374]; // Trên-dưới mắt phải
const RIGHT_EYE_OUTER = [362, 263]; // Góc ngoài-trong mắt phải
// Head pose landmarks
const NOSE_TIP = 1;
const CHIN = 152;
const LEFT_EYE_OUTER_CORNER = 33;
const RIGHT_EYE_OUTER_CORNER = 263;
const LEFT_MOUTH_CORNER = 61;
const RIGHT_MOUTH_CORNER = 291;

// Landmarks đại diện phân bố khắp khuôn mặt — dùng cho rigid motion detection
// Chọn các điểm ở vùng khác nhau: trán, mắt, mũi, miệng, cằm, má
const RIGID_CHECK_LANDMARKS = [
  10,   // Trán giữa
  33,   // Góc mắt trái ngoài
  133,  // Góc mắt trái trong
  362,  // Góc mắt phải ngoài
  263,  // Góc mắt phải trong
  1,    // Đầu mũi
  61,   // Mép miệng trái
  291,  // Mép miệng phải
  152,  // Cằm
  234,  // Má trái
  454,  // Má phải
  159,  // Mí mắt trái trên
  386,  // Mí mắt phải trên
  145,  // Mí mắt trái dưới
  374,  // Mí mắt phải dưới
  13,   // Môi trên giữa
  14,   // Môi dưới giữa
];

/**
 * Tính khoảng cách Euclidean giữa 2 landmark (2D)
 */
function distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Tính Eye Aspect Ratio (EAR) cho 1 mắt.
 * EAR = khoảng cách dọc / khoảng cách ngang
 * Khi mắt mở: EAR ≈ 0.25-0.35
 * Khi mắt nhắm: EAR ≈ 0.05-0.10
 */
function computeEAR(landmarks: NormalizedLandmark[]): number {
  // Mắt trái
  const leftVertical = distance(landmarks[LEFT_EYE_TOP[0]], landmarks[LEFT_EYE_TOP[1]]);
  const leftHorizontal = distance(landmarks[LEFT_EYE_OUTER[0]], landmarks[LEFT_EYE_OUTER[1]]);
  const leftEAR = leftVertical / (leftHorizontal + 1e-6);

  // Mắt phải
  const rightVertical = distance(landmarks[RIGHT_EYE_TOP[0]], landmarks[RIGHT_EYE_TOP[1]]);
  const rightHorizontal = distance(landmarks[RIGHT_EYE_OUTER[0]], landmarks[RIGHT_EYE_OUTER[1]]);
  const rightEAR = rightVertical / (rightHorizontal + 1e-6);

  // Trung bình 2 mắt
  return (leftEAR + rightEAR) / 2;
}

/**
 * Tính head pose đơn giản qua tỷ lệ khoảng cách landmarks.
 * Trả về [yawRatio, pitchRatio] - các giá trị thay đổi khi đầu di chuyển.
 */
function computeHeadPose(landmarks: NormalizedLandmark[]): [number, number] {
  const nose = landmarks[NOSE_TIP];
  const chin = landmarks[CHIN];
  const leftEye = landmarks[LEFT_EYE_OUTER_CORNER];
  const rightEye = landmarks[RIGHT_EYE_OUTER_CORNER];
  const leftMouth = landmarks[LEFT_MOUTH_CORNER];
  const rightMouth = landmarks[RIGHT_MOUTH_CORNER];

  // Yaw: tỷ lệ khoảng cách mũi đến mắt trái vs mũi đến mắt phải
  const noseToLeftEye = distance(nose, leftEye);
  const noseToRightEye = distance(nose, rightEye);
  const yawRatio = noseToLeftEye / (noseToRightEye + 1e-6);

  // Pitch: tỷ lệ khoảng cách mũi-cằm vs giữa 2 mép miệng
  const noseToChin = distance(nose, chin);
  const mouthWidth = distance(leftMouth, rightMouth);
  const pitchRatio = noseToChin / (mouthWidth + 1e-6);

  return [yawRatio, pitchRatio];
}

/**
 * Tính MSE (Mean Squared Error) giữa 2 ImageData.
 * So sánh từng pixel R,G,B (bỏ qua Alpha) rồi lấy trung bình.
 */
function computePixelMSE(img1: ImageData, img2: ImageData): number {
  const len = img1.data.length;
  let sumSqDiff = 0;
  let pixelCount = 0;

  // Duyệt qua mỗi pixel (4 bytes: R, G, B, A)
  for (let i = 0; i < len; i += 4) {
    const dr = img1.data[i] - img2.data[i];       // Red
    const dg = img1.data[i + 1] - img2.data[i + 1]; // Green
    const db = img1.data[i + 2] - img2.data[i + 2]; // Blue
    sumSqDiff += dr * dr + dg * dg + db * db;
    pixelCount++;
  }

  return sumSqDiff / (pixelCount * 3); // Chia cho 3 kênh màu
}

/**
 * Phát hiện Rigid Motion: khi di chuyển ảnh tĩnh, TẤT CẢ landmarks dịch chuyển
 * cùng hướng và cùng khoảng cách (như 1 vật cứng). Ngược lại, khuôn mặt người thật
 * có các phần chuyển động độc lập (mắt chớp, môi động, lông mày nhíu...).
 *
 * Cách đo: tính vector dịch chuyển (dx, dy) của từng landmark giữa 2 frame,
 * rồi đo "độ đồng đều" (uniformity) = 1 - (std_dev / mean).
 * - Ảnh tĩnh di chuyển: uniformity ≈ 0.95-1.0 (tất cả vector gần giống nhau)
 * - Người thật: uniformity ≈ 0.5-0.85 (vector khác nhau do micro-expressions)
 */
function computeRigidMotion(
  landmarks1: NormalizedLandmark[],
  landmarks2: NormalizedLandmark[]
): { uniformity: number; avgMovement: number } {
  const dxList: number[] = [];
  const dyList: number[] = [];
  const magnitudes: number[] = [];

  for (const idx of RIGID_CHECK_LANDMARKS) {
    const dx = landmarks2[idx].x - landmarks1[idx].x;
    const dy = landmarks2[idx].y - landmarks1[idx].y;
    dxList.push(dx);
    dyList.push(dy);
    magnitudes.push(Math.sqrt(dx * dx + dy * dy));
  }

  const avgMovement = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;

  // Nếu hầu như không di chuyển → bỏ qua rigid check
  if (avgMovement < LIVENESS_CONFIG.RIGID_MIN_MOVEMENT) {
    return { uniformity: 0, avgMovement };
  }

  // Tính uniformity: so sánh hướng dịch chuyển (angle) của mỗi landmark
  // với hướng trung bình. Nếu tất cả cùng hướng → rigid.
  const avgDx = dxList.reduce((a, b) => a + b, 0) / dxList.length;
  const avgDy = dyList.reduce((a, b) => a + b, 0) / dyList.length;
  const avgAngle = Math.atan2(avgDy, avgDx);

  // Đo mức "lệch hướng" của từng landmark so với hướng trung bình
  let sumAngleDiff = 0;
  let validCount = 0;
  for (let i = 0; i < dxList.length; i++) {
    if (magnitudes[i] < 0.0005) continue; // Bỏ qua landmark gần như đứng yên
    const angle = Math.atan2(dyList[i], dxList[i]);
    let diff = Math.abs(angle - avgAngle);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    sumAngleDiff += diff;
    validCount++;
  }

  if (validCount < 5) return { uniformity: 0, avgMovement };

  const avgAngleDiff = sumAngleDiff / validCount;
  // Normalize: diff = 0 → uniformity = 1 (hoàn toàn đồng đều = rigid)
  // diff = π → uniformity = 0 (hoàn toàn ngẫu nhiên)
  const uniformity = Math.max(0, 1 - avgAngleDiff / (Math.PI / 4));

  return { uniformity, avgMovement };
}

/**
 * Tính standard deviation của 1 mảng số
 */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Tính variance (phương sai) của 1 mảng số
 */
function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

// ─── Hook chính ──────────────────────────────────────────────────────────────
export function usePassiveLiveness() {
  /**
   * Chụp nhiều frame liên tiếp từ video element, đồng thời chạy FaceLandmarker
   * để lấy landmarks cho mỗi frame.
   */
  const captureFramesWithLandmarks = useCallback(
    async (
      videoEl: HTMLVideoElement,
      landmarker: FaceLandmarker,
      frameCount: number = LIVENESS_CONFIG.FRAME_COUNT,
      intervalMs: number = LIVENESS_CONFIG.FRAME_INTERVAL_MS
    ): Promise<{
      imageDataList: ImageData[];
      landmarksList: NormalizedLandmark[][];
      bestFrameCanvas: HTMLCanvasElement | null;
    }> => {
      const imageDataList: ImageData[] = [];
      const landmarksList: NormalizedLandmark[][] = [];
      let bestFrameCanvas: HTMLCanvasElement | null = null;
      let bestConfidence = -1;

      // Canvas tạm để chụp frame
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = videoEl.videoWidth;
      tempCanvas.height = videoEl.videoHeight;
      const ctx = tempCanvas.getContext("2d", { willReadFrequently: true })!;

      for (let i = 0; i < frameCount; i++) {
        // Vẽ frame hiện tại lên canvas
        ctx.drawImage(videoEl, 0, 0, tempCanvas.width, tempCanvas.height);

        // Lấy ImageData để tính pixel diff
        const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        imageDataList.push(imageData);

        // Chạy FaceLandmarker
        const result = landmarker.detectForVideo(tempCanvas, performance.now());
        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
          landmarksList.push(result.faceLandmarks[0]);

          // Chọn frame có confidence cao nhất để gửi lên Rekognition
          const confidence = result.faceBlendshapes?.[0]?.categories?.[0]?.score ?? 0.5;
          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestFrameCanvas = document.createElement("canvas");
            bestFrameCanvas.width = videoEl.videoWidth;
            bestFrameCanvas.height = videoEl.videoHeight;
            const bestCtx = bestFrameCanvas.getContext("2d")!;
            bestCtx.drawImage(videoEl, 0, 0);
          }
        }

        // Chờ interval trước frame tiếp (trừ frame cuối)
        if (i < frameCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
      }

      // Nếu không chọn được best frame, lấy frame cuối
      if (!bestFrameCanvas) {
        bestFrameCanvas = document.createElement("canvas");
        bestFrameCanvas.width = videoEl.videoWidth;
        bestFrameCanvas.height = videoEl.videoHeight;
        const fallbackCtx = bestFrameCanvas.getContext("2d")!;
        fallbackCtx.drawImage(videoEl, 0, 0);
      }

      return { imageDataList, landmarksList, bestFrameCanvas };
    },
    []
  );

  /**
   * Kiểm tra liveness dựa trên dữ liệu đã chụp.
   * 4 tầng:
   *  - Layer 1 (soft): Pixel MSE — có chuyển động pixel hay không
   *  - Layer 2 (soft): Eye Blink (EAR) — mắt có chớp không
   *  - Layer 3 (soft): Head Pose — đầu có micro-movement không
   *  - Layer 4 (HARD): Rigid Motion — landmarks có dịch chuyển đồng đều không
   *
   * Điều kiện pass: Rigid Motion KHÔNG bị phát hiện + ≥ 2/3 soft layers pass.
   */
  const checkLiveness = useCallback(
    (imageDataList: ImageData[], landmarksList: NormalizedLandmark[][]): LivenessResult => {
      let passedLayers = 0;
      const reasons: string[] = [];

      // ── Layer 1: Pixel MSE ──────────────────────────────────────────────
      let avgMSE = 0;
      if (imageDataList.length >= 2) {
        const mseValues: number[] = [];
        for (let i = 1; i < imageDataList.length; i++) {
          mseValues.push(computePixelMSE(imageDataList[i - 1], imageDataList[i]));
        }
        avgMSE = mseValues.reduce((a, b) => a + b, 0) / mseValues.length;
        if (avgMSE > LIVENESS_CONFIG.PIXEL_MSE_THRESHOLD) {
          passedLayers++;
        } else {
          reasons.push(`Pixel MSE quá thấp (${avgMSE.toFixed(2)} < ${LIVENESS_CONFIG.PIXEL_MSE_THRESHOLD})`);
        }
      }

      // ── Layer 2: Eye Blink (EAR) ───────────────────────────────────────
      let earStd = 0;
      if (landmarksList.length >= 2) {
        const earValues = landmarksList.map((lm) => computeEAR(lm));
        earStd = stdDev(earValues);
        if (earStd > LIVENESS_CONFIG.EAR_STD_THRESHOLD) {
          passedLayers++;
        } else {
          reasons.push(`EAR std quá thấp (${earStd.toFixed(4)} < ${LIVENESS_CONFIG.EAR_STD_THRESHOLD})`);
        }
      }

      // ── Layer 3: Head Pose Micro-Movement ──────────────────────────────
      let headPoseVar = 0;
      if (landmarksList.length >= 2) {
        const yawValues = landmarksList.map((lm) => computeHeadPose(lm)[0]);
        const pitchValues = landmarksList.map((lm) => computeHeadPose(lm)[1]);
        const yawVar = variance(yawValues);
        const pitchVar = variance(pitchValues);
        headPoseVar = (yawVar + pitchVar) * 1000; // Scale lên để dễ so sánh
        if (headPoseVar > LIVENESS_CONFIG.HEAD_POSE_THRESHOLD) {
          passedLayers++;
        } else {
          reasons.push(`Head pose variance quá thấp (${headPoseVar.toFixed(4)} < ${LIVENESS_CONFIG.HEAD_POSE_THRESHOLD})`);
        }
      }

      // ── Layer 4 (HARD): Rigid Motion Detection ─────────────────────────
      // Phát hiện ảnh tĩnh bị di chuyển: tất cả landmarks dịch chuyển
      // cùng hướng, cùng tốc độ (rigid body). Nếu phát hiện → FAIL ngay.
      let maxUniformity = 0;
      let rigidMotionDetected = false;
      if (landmarksList.length >= 2) {
        const uniformities: number[] = [];
        for (let i = 1; i < landmarksList.length; i++) {
          const { uniformity, avgMovement } = computeRigidMotion(
            landmarksList[i - 1],
            landmarksList[i]
          );
          // Chỉ tính khi có chuyển động đáng kể
          if (avgMovement >= LIVENESS_CONFIG.RIGID_MIN_MOVEMENT) {
            uniformities.push(uniformity);
          }
        }

        if (uniformities.length > 0) {
          maxUniformity = Math.max(...uniformities);
          // Nếu PHẦN LỚN các cặp frame đều có rigid motion → FAKE
          const rigidCount = uniformities.filter(
            (u) => u > LIVENESS_CONFIG.RIGID_UNIFORMITY_THRESHOLD
          ).length;
          rigidMotionDetected = rigidCount >= Math.ceil(uniformities.length / 2);
        }
      }

      // ── Kết luận ───────────────────────────────────────────────────────
      // Rigid motion là HARD check — nếu phát hiện → FAIL bất kể soft layers
      const softLayersPass = passedLayers >= LIVENESS_CONFIG.MIN_LAYERS_PASS;
      const isLive = softLayersPass && !rigidMotionDetected;

      let reason: string | undefined;
      if (rigidMotionDetected) {
        reason = "Phát hiện ảnh tĩnh đang bị di chuyển. Vui lòng sử dụng khuôn mặt thật.";
      } else if (!softLayersPass) {
        reason = "Phát hiện ảnh tĩnh. Vui lòng sử dụng khuôn mặt thật để đăng nhập.";
      }

      return {
        isLive,
        scores: {
          pixelMSE: avgMSE,
          earStd,
          headPoseVariance: headPoseVar,
          rigidUniformity: maxUniformity,
        },
        passedLayers,
        rigidMotionDetected,
        reason,
      };
    },
    []
  );

  return {
    captureFramesWithLandmarks,
    checkLiveness,
    LIVENESS_CONFIG,
  };
}
