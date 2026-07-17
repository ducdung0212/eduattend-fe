"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import { IconCamera, IconCheck, IconX, IconTrash, IconAlertTriangle } from "@tabler/icons-react";

interface ImageItem {
    file: File;
    preview: string;
    user_code: string;
}

function parseCodeFromFileName(fileName: string): string {
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    return baseName.toUpperCase().trim();
}

export default function FaceRegistrationPage() {
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<"student" | "lecturer">("student");
    const [images, setImages] = useState<ImageItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const selectedFiles = Array.from(e.target.files);
        const validImages: ImageItem[] = [];
        let hasInvalidFile = false;
        let hasUnrecognizedCode = false;

        const ALLOWED_TYPES = ["image/jpeg", "image/png"];

        selectedFiles.forEach((file) => {
            if (!ALLOWED_TYPES.includes(file.type)) {
                hasInvalidFile = true;
            } else if (file.size > 5 * 1024 * 1024) {
                hasInvalidFile = true;
            } else {
                const user_code = parseCodeFromFileName(file.name);
                if (!user_code) hasUnrecognizedCode = true;

                validImages.push({
                    file,
                    preview: URL.createObjectURL(file),
                    user_code,
                });
            }
        });

        if (hasInvalidFile) {
            toast.error("Một số file không hợp lệ (sai định dạng hoặc quá 5MB) đã bị bỏ qua.");
        }
        if (hasUnrecognizedCode) {
            toast.error("Một số ảnh không nhận diện được Mã từ tên file. Vui lòng đặt lại tên file cho đúng quy ước.");
        }

        setImages((prev) => [...prev, ...validImages]);

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setImages((prev) => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[indexToRemove].preview);
            newImages.splice(indexToRemove, 1);
            return newImages;
        });
    };

    const handleClearAll = () => {
        images.forEach((img) => URL.revokeObjectURL(img.preview));
        setImages([]);
    };

    const handleUploadS3 = async () => {
        if (images.length === 0) return toast.error("Vui lòng chọn ít nhất một ảnh.");

        const missingCodeCount = images.filter((img) => !img.user_code).length;
        if (missingCodeCount > 0) {
            return toast.error(`Còn ${missingCodeCount} ảnh chưa nhận diện được Mã. Vui lòng đặt lại tên file rồi chọn lại ảnh đó.`);
        }

        setUploading(true);

        try {
            // [BƯỚC 1]: Lấy Presigned URLs từ backend
            const generatePayload = images.map((img) => ({
                fileName: img.file.name,
                fileType: img.file.type as "image/jpeg" | "image/png",
            }));

            const generateRes = await api.post(`/${activeTab === 'student' ? 'student' : 'lecturer'}-photos/generate-upload-urls`, {
                files: generatePayload,
            });

            const uploadConfigs: { fileName: string; success: boolean; uploadUrl?: string; message?: string }[] =
                generateRes.data?.data || generateRes.data;

            if (!uploadConfigs || uploadConfigs.length === 0) {
                throw new Error("Không thể lấy cấu hình Upload từ máy chủ AWS.");
            }

            // [BƯỚC 2]: Upload song song lên S3, chỉ những file có uploadUrl hợp lệ
            const configByFileName = new Map(uploadConfigs.map((c) => [c.fileName, c]));

            const uploadResults = await Promise.all(
                images.map(async (img) => {
                    const config = configByFileName.get(img.file.name);

                    if (!config || !config.success || !config.uploadUrl) {
                        return {
                            img,
                            s3Ok: false,
                            reason: config?.message || "Không nhận được URL upload",
                        };
                    }

                    try {
                        const res = await fetch(config.uploadUrl, {
                            method: "PUT",
                            body: img.file,
                            headers: { "Content-Type": img.file.type },
                        });
                        return { img, s3Ok: res.ok, reason: res.ok ? "" : `HTTP ${res.status}` };
                    } catch (fetchErr: any) {
                        return { img, s3Ok: false, reason: fetchErr?.message || "Lỗi mạng khi upload" };
                    }
                })
            );

            const successfulUploads = uploadResults.filter((r) => r.s3Ok);
            const failedBeforeConfirm = uploadResults.filter((r) => !r.s3Ok);

            if (successfulUploads.length === 0) {
                throw new Error("Tất cả ảnh đều thất bại khi đẩy lên hệ thống lưu trữ. Vui lòng thử lại.");
            }

            // [BƯỚC 3]: Gọi backend confirm các file đã upload S3 thành công
            const confirmPayload = successfulUploads.map((r) => {
                if (activeTab === "student") {
                    return { fileName: r.img.file.name, student_code: r.img.user_code };
                } else {
                    return { fileName: r.img.file.name, lecturer_code: r.img.user_code };
                }
            });

            const confirmRes = await api.post(`/${activeTab === 'student' ? 'student' : 'lecturer'}-photos/confirm-uploads`, {
                uploads: confirmPayload,
            });

            const results: { success: boolean; fileName: string; student_code: string; message: string }[] =
                confirmRes.data?.data || confirmRes.data;

            // [BƯỚC 4]: Gộp kết quả lỗi từ bước S3 + bước confirm
            const allFailures: { name: string; reason: string }[] = [];

            failedBeforeConfirm.forEach((r) => {
                allFailures.push({
                    name: r.img.file.name,
                    reason: r.reason,
                });
            });

            if (Array.isArray(results)) {
                results
                    .filter((r) => !r.success)
                    .forEach((r) => {
                        allFailures.push({
                            name: r.fileName || r.student_code,
                            reason: r.message,
                        });
                    });
            }

            const successCount = Array.isArray(results)
                ? results.filter((r) => r.success).length
                : successfulUploads.length;

            if (allFailures.length === 0) {
                toast.success(`Đã lưu thành công toàn bộ ${successCount} ảnh!`);
                handleClearAll();
            } else if (successCount > 0) {
                toast(
                    (t) => (
                        <div className="text-sm">
                            <p className="font-semibold text-green-600 mb-1">✅ {successCount} ảnh lưu thành công</p>
                            <p className="font-semibold text-rose-600 mb-2">❌ {allFailures.length} ảnh thất bại:</p>
                            <div className="max-h-32 overflow-y-auto pr-1 space-y-1">
                                {allFailures.map((err, i) => (
                                    <div key={i} className="bg-rose-50 border border-rose-100 rounded px-2 py-1.5 text-xs text-rose-700">
                                        <span className="font-semibold">{err.name}:</span> {err.reason}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ),
                    { duration: 8000 }
                );

                const successFileNames = new Set(
                    Array.isArray(results)
                        ? results.filter((r) => r.success).map((r) => r.fileName)
                        : successfulUploads.map((r) => r.img.file.name)
                );
                setImages((prev) => prev.filter((img) => !successFileNames.has(img.file.name)));
            } else {
                toast.error(
                    (t) => (
                        <div className="text-sm">
                            <p className="font-semibold text-rose-600 mb-2">Lưu thất bại toàn bộ:</p>
                            <div className="max-h-40 overflow-y-auto pr-1 space-y-1">
                                {allFailures.map((err, i) => (
                                    <div key={i} className="bg-rose-50 border border-rose-100 rounded px-2 py-1.5 text-xs text-rose-700">
                                        <span className="font-semibold">{err.name}:</span> {err.reason}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ),
                    { duration: 8000 }
                );
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setUploading(false);
        }
    };

            const uniqueUserCount = new Set(images.map((img) => img.user_code).filter(Boolean)).size;
    const missingCodeCount = images.filter((img) => !img.user_code).length;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "student"
                            ? "border-blue-600 text-blue-600 bg-blue-50/50"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => { setActiveTab("student"); setImages([]); }}
                >
                    Đăng ký Sinh viên
                </button>
                <button
                    className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "lecturer"
                            ? "border-blue-600 text-blue-600 bg-blue-50/50"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => { setActiveTab("lecturer"); setImages([]); }}
                >
                    Đăng ký Giảng viên
                </button>
            </div>

            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-xl font-medium text-slate-900 tracking-tight">
                        Đăng ký ảnh khuôn mặt {activeTab === "student" ? "sinh viên" : "giảng viên"} theo lô
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Mã số được tự nhận diện từ tên file ảnh đã chọn.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    <div className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        Đã chọn: {images.length} ảnh · {uniqueUserCount} {activeTab === "student" ? "sinh viên" : "giảng viên"}
                    </div>
                    {missingCodeCount > 0 && (
                        <div className="text-xs font-medium text-rose-600 bg-rose-50 px-3 py-1 rounded-lg border border-rose-100 flex items-center gap-1">
                            <IconAlertTriangle className="w-3.5 h-3.5" /> {missingCodeCount} ảnh thiếu mã
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg, image/png"
                    className="hidden"
                />

                {images.length === 0 ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 hover:border-slate-400 p-12 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 transition-colors"
                    >
                        <IconCamera className="w-10 h-10 text-slate-400 mb-3" />
                        <div className="text-base font-medium text-slate-700">
                            Nhấp hoặc quét khối để chọn nhiều ảnh
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                            Tên file phải chứa {activeTab === "student" ? "MSSV (VD: DH52200529.png)" : "Mã GV (VD: GV001.png)"}
                            <br />
                            Hỗ trợ JPG, PNG (Tối đa 5MB/file)
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                            {images.map((img, index) => (
                                <div
                                    key={index}
                                    className={`relative group rounded-md overflow-hidden border bg-slate-100 aspect-square shadow-sm ${
                                        img.user_code ? "border-slate-200" : "border-rose-300"
                                    }`}
                                >
                                    <img
                                        src={img.preview}
                                        alt={`Preview ${index}`}
                                        className="w-full h-full object-cover"
                                    />

                                    <div
                                        className={`absolute bottom-0 inset-x-0 text-white text-[10px] font-semibold text-center py-0.5 px-1 truncate ${
                                            img.user_code ? "bg-black/60" : "bg-rose-600/90"
                                        }`}
                                    >
                                        {img.user_code || "Chưa rõ mã"}
                                    </div>

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pb-3">
                                        <button
                                            onClick={() => handleRemoveImage(index)}
                                            className="bg-white text-rose-600 p-1.5 rounded-full hover:bg-rose-50 transition-colors shadow-sm"
                                            title="Xóa ảnh này"
                                        >
                                            <IconTrash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-md flex flex-col items-center justify-center cursor-pointer bg-slate-50 aspect-square transition-colors text-slate-500 hover:text-slate-700"
                            >
                                <IconCamera className="w-5 h-5 mb-0.5" />
                                <span className="text-[10px] font-medium uppercase tracking-wider">Thêm</span>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                            <Button
                                variant="secondary"
                                onClick={handleClearAll}
                                disabled={uploading}
                            >
                                <IconX className="w-4 h-4 mr-1.5" /> Xóa tất cả
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleUploadS3}
                                loading={uploading}
                                disabled={missingCodeCount > 0}
                            >
                                <IconCheck className="w-4 h-4 mr-1.5" /> {uploading ? "Đang xử lý..." : "Lưu tất cả vào hệ thống"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Hướng dẫn */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800">
                <strong className="block mb-1">Yêu cầu hình ảnh hợp lệ:</strong>
                <ul className="list-disc list-inside space-y-1 ml-1 opacity-90">
                    <li>Tên file phải chứa mã {activeTab === "student" ? "sinh viên" : "giảng viên"} (hệ thống tự nhận diện tên file).</li>
                    <li>Ảnh chụp rõ nét, nhìn thẳng vào ống kính.</li>
                    <li>Khuôn mặt chiếm tối thiểu 60% khung hình.</li>
                    <li>Không đeo kính râm, khẩu trang hoặc đội mũ che khuất trán.</li>
                </ul>
            </div>
        </div>
    );
}