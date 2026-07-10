"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export interface ImportModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title: string;
    endpoint: string;
    extraPayload?: Record<string, string | Blob>;
    children?: React.ReactNode;
    isSubmitDisabled?: boolean;
    templateUrl?: string;
}

export function ImportModal({
    open,
    onClose,
    onSuccess,
    title,
    endpoint,
    extraPayload,
    children,
    isSubmitDisabled,
    templateUrl
}: ImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    // Reset file khi mở lại modal
    useEffect(() => {
        if (open) {
            setFile(null);
        }
    }, [open]);

    const handleImport = async () => {
        if (!file) return toast.error("Vui lòng chọn file excel");

        const formData = new FormData();
        formData.append("file", file);
        
        if (extraPayload) {
            Object.entries(extraPayload).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }

        setLoading(true);
        try {
            const res = await api.post(endpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 300000 // 5 phút để import file lớn
            });
            toast.success(res.data?.message || "Import thành công");
            onSuccess();
            onClose();
        } catch (err: any) {
            const msg = err.response?.data?.message || "Lỗi khi import dữ liệu";
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Hủy</Button>
                    <Button variant="primary" loading={loading} disabled={isSubmitDisabled} onClick={handleImport}>Bắt đầu Import</Button>
                </>
            }
        >
            <div className="space-y-6 py-2">
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id={`excel-upload-${endpoint.replace(/\//g, '-')}`}
                    />
                    <label htmlFor={`excel-upload-${endpoint.replace(/\//g, '-')}`} className="cursor-pointer block">
                        <div className="text-slate-500 mb-2">
                            {file ? <span className="text-blue-600 font-medium">{file.name}</span> : "Kéo thả hoặc click để chọn file Excel"}
                        </div>
                        <p className="text-xs text-slate-400">Hỗ trợ định dạng .xlsx, .xls</p>
                    </label>
                    {templateUrl && (
                        <div className="mt-6 flex justify-center">
                            <a href={templateUrl} download className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors">
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Tải file mẫu (.xlsx)
                            </a>
                        </div>
                    )}
                </div>
                
                {children}
            </div>
        </Modal>
    );
}
