"use client";

import React, { useEffect, useState, useRef } from "react";
import { FaceLivenessDetector } from "@aws-amplify/ui-react-liveness";
import { Amplify } from "aws-amplify";
import "@aws-amplify/ui-react/styles.css";
import { createLivenessSession } from "@/lib/auth";

// Cấu hình Amplify để sử dụng Cognito Identity Pool (Unauthenticated) cho Liveness
Amplify.configure({
  Auth: {
    Cognito: {
      identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID || "",
      allowGuestAccess: true,
    }
  }
});

// Bản dịch tiếng Việt cho FaceLivenessDetector
const vietnameseDisplayText = {
  // Hướng dẫn chính
  hintCenterFaceText: "Đặt khuôn mặt vào giữa",
  hintCenterFaceInstructionText: "Hướng dẫn: Trước khi bắt đầu, đặt camera ở chính giữa phía trên màn hình và đưa khuôn mặt ra giữa camera. Khi kiểm tra bắt đầu, một hình oval sẽ xuất hiện ở giữa. Bạn sẽ được yêu cầu di chuyển lại gần hình oval và giữ yên.",
  hintMoveFaceFrontOfCameraText: "Đưa khuôn mặt ra trước camera",
  hintTooManyFacesText: "Chỉ được phép 1 khuôn mặt trước camera",
  hintFaceDetectedText: "Đã nhận diện khuôn mặt",
  hintCanNotIdentifyText: "Đưa khuôn mặt ra trước camera",
  hintTooCloseText: "Lùi ra xa hơn",
  hintTooFarText: "Tiến lại gần hơn",
  hintConnectingText: "Đang kết nối...",
  hintVerifyingText: "Đang xác thực...",
  hintCheckCompleteText: "Kiểm tra hoàn tất",
  hintIlluminationTooBrightText: "Di chuyển đến nơi tối hơn",
  hintIlluminationTooDarkText: "Di chuyển đến nơi sáng hơn",
  hintIlluminationNormalText: "Điều kiện ánh sáng bình thường",
  hintHoldFaceForFreshnessText: "Giữ yên",
  hintMatchIndicatorText: "Đã hoàn thành 50%. Tiếp tục tiến lại gần.",
  hintFaceOffCenterText: "Khuôn mặt chưa ở giữa, hãy đưa mặt vào giữa camera",
  // Nút và nhãn
  cancelLivenessCheckText: "Huỷ kiểm tra",
  startScreenBeginCheckText: "Bắt đầu kiểm tra",
  recordingIndicatorText: "",
  // Cảnh báo nhạy cảm ánh sáng
  photosensitivityWarningHeadingText: "Cảnh báo nhạy cảm ánh sáng",
  photosensitivityWarningBodyText: "Quá trình kiểm tra sẽ nhấp nháy nhiều màu sắc. Hãy cẩn thận nếu bạn nhạy cảm với ánh sáng.",
  photosensitivityWarningInfoText: "Một số người có thể bị co giật khi tiếp xúc với ánh sáng màu. Hãy cẩn thận nếu bạn hoặc gia đình có tiền sử động kinh.",
  photosensitivityWarningLabelText: "Thông tin thêm về nhạy cảm ánh sáng",
  // Camera
  cameraMinSpecificationsHeadingText: "Camera không đạt yêu cầu tối thiểu",
  cameraMinSpecificationsMessageText: "Camera phải hỗ trợ ít nhất 320x240 và 15 khung hình/giây.",
  cameraNotFoundHeadingText: "Không truy cập được camera",
  cameraNotFoundMessageText: "Kiểm tra camera đã được kết nối và không có ứng dụng khác đang sử dụng. Bạn có thể cần vào cài đặt để cấp quyền camera.",
  a11yVideoLabelText: "Webcam kiểm tra khuôn mặt",
  waitingCameraPermissionText: "Đang chờ bạn cấp quyền camera.",
  retryCameraPermissionsText: "Thử lại",
  // Kết quả phù hợp
  goodFitCaptionText: "Vừa vặn",
  goodFitAltText: "Minh hoạ khuôn mặt vừa vặn trong hình oval.",
  tooFarCaptionText: "Quá xa",
  tooFarAltText: "Minh hoạ khuôn mặt quá xa hình oval.",
  // Lỗi
  errorLabelText: "Lỗi",
  connectionTimeoutHeaderText: "Hết thời gian kết nối",
  connectionTimeoutMessageText: "Kết nối đã hết thời gian chờ.",
  timeoutHeaderText: "Hết thời gian",
  timeoutMessageText: "Khuôn mặt chưa vừa vặn trong hình oval đúng thời gian. Vui lòng thử lại.",
  faceDistanceHeaderText: "Phát hiện di chuyển về phía trước",
  faceDistanceMessageText: "Tránh di chuyển lại gần khi đang kết nối.",
  multipleFacesHeaderText: "Phát hiện nhiều khuôn mặt",
  multipleFacesMessageText: "Chỉ được có 1 khuôn mặt trước camera khi kết nối.",
  clientHeaderText: "Lỗi trình duyệt",
  clientMessageText: "Kiểm tra thất bại do lỗi trình duyệt.",
  serverHeaderText: "Hết hạn hoặc Lỗi máy chủ",
  serverMessageText: "Kết nối đã hết hạn do chờ quá lâu hoặc có lỗi từ máy chủ AWS. Vui lòng thử lại.",
  landscapeHeaderText: "Không hỗ trợ xoay ngang",
  landscapeMessageText: "Xoay thiết bị về chế độ dọc (portrait).",
  portraitMessageText: "Giữ thiết bị ở chế độ dọc trong suốt quá trình kiểm tra.",
  tryAgainText: "Thử lại",
};

interface LecturerLivenessLoginProps {
  onLivenessComplete: (sessionId: string) => void;
  onLivenessError: (error: any) => void;
  onCancel: () => void;
}

export function LecturerLivenessLogin({
  onLivenessComplete,
  onLivenessError,
  onCancel,
}: LecturerLivenessLoginProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isCompletedRef = useRef(false);

  useEffect(() => {
    // Khởi tạo phiên Liveness khi component được render
    const initSession = async () => {
      try {
        const id = await createLivenessSession();
        setSessionId(id);
      } catch (err) {
        console.error("Failed to create liveness session", err);
        onLivenessError("Không thể khởi tạo phiên quét khuôn mặt.");
      } finally {
        setLoading(false);
      }
    };
    initSession();
  }, [onLivenessError]);

  if (loading) {
    return (
      <div className="flex w-full max-w-[420px] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 py-16">
        <span className="relative flex h-14 w-14 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
            <i className="ti ti-camera text-xl text-emerald-500" aria-hidden="true" />
          </span>
        </span>
        <p className="text-sm font-medium text-slate-500">Đang chuẩn bị camera...</p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <i className="ti ti-plug-connected-x text-2xl text-red-500" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-red-700">Lỗi kết nối máy chủ.</p>
        <button
          onClick={onCancel}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px]">
      <p className="mb-3 text-center text-sm text-slate-500">
        Đưa khuôn mặt vào giữa khung hình và giữ yên
      </p>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Ép tất cả các lớp vỏ bọc ngoài cùng giãn to hết cỡ (100% của 550px) */
        .my-liveness-wrapper > div,
        .my-liveness-wrapper > div > div,
        .my-liveness-wrapper > div > div > div {
          height: 100% !important;
          width: 100% !important;
        }

        /* Khung chính của camera: Giãn to 100% (550px), dùng flex để giữ camera luôn nằm giữa */
        .amplify-liveness-camera-module {
          height: 100% !important;
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        /* KHÔNG ĐỤNG CHẠM VÀO .amplify-liveness-video-anchor ĐỂ TRÁNH MÉO MẶT VÀ BỊ THU NHỎ */

        /* Vì camera-module đã cao 550px, nên absolute top 1.5rem sẽ nằm chót vót trên đỉnh */
        .amplify-liveness-instruction-overlay {
          position: absolute !important;
          top: 1.5rem !important;
          left: 0 !important;
          width: 100% !important;
          justify-content: flex-start !important;
        }
        
        .amplify-liveness-hint {
          margin-top: 0 !important;
        }

        /* Ẩn chấm đỏ */
        .amplify-liveness-recording-icon-container {
          display: none !important;
        }

        /* Neo nút X lên góc phải */
        .amplify-liveness-cancel-container {
          position: absolute !important;
          top: 1rem !important;
          right: 1.5rem !important;
        }
      `}} />

      <div className="my-liveness-wrapper relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm h-[70vh] max-h-[600px] min-h-[400px] sm:h-[550px]">
        <FaceLivenessDetector
          sessionId={sessionId}
          region={process.env.NEXT_PUBLIC_AWS_LIVENESS_REGION || "ap-northeast-1"}
          displayText={vietnameseDisplayText}
          onAnalysisComplete={async () => {
            isCompletedRef.current = true; // ĐÁNH DẤU: Quét xong
            onLivenessComplete(sessionId);
          }}
          onUserCancel={() => {
            // Khi bị khóa IP, component này bị gỡ (unmount), Amplify sẽ tự kích hoạt onUserCancel.
            // Phải dùng cờ này để chặn nó, nếu không nó sẽ tự động chuyển về trang mật khẩu!
            if (!isCompletedRef.current) {
              console.log("User cancelled liveness check");
              onCancel();
            }
          }}
          onError={(error: any) => {
            console.error("Liveness Error:", error);
            if (isCompletedRef.current) return; // Nếu đã xong thì không quan tâm lỗi phụ (như cancel stream)
            const errorState = String(error?.state || error?.message || error?.name || "");
            
            // Xử lý Timeout
            if (errorState.includes("TIMEOUT")) {
              return;
            }
            // Xử lý Cancel thực sự
            if (errorState.includes("USER_CANCEL")) {
              if (!isCompletedRef.current) onCancel();
              return;
            }

            // Bỏ qua báo lỗi đỏ ra bên ngoài nếu là lỗi máy chủ/timeout vì thư viện tự có màn hình báo lỗi riêng
            if (errorState.includes("SERVER_ERROR")) {
              return;
            }
            
            onLivenessError(error?.message || errorState || "Lỗi trong quá trình quét khuôn mặt");
          }}
          disableStartScreen={true}
          components={{
            PhotosensitiveWarning: () => (
              <div className="absolute inset-x-0 top-2 px-4 text-center">
                <span className="rounded bg-black/50 px-2 py-1 text-xs text-white/70">
                  Chú ý: Màn hình sẽ nhấp nháy nhiều màu sắc
                </span>
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
}