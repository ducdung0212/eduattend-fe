'use client'

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { useState } from "react";
import toast from "react-hot-toast";

export interface SubjectImportModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}
export function SubjectImportModal({ open, onClose, onSuccess }: SubjectImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleImport = async () => {
        if (!file) return toast.error("Vui lòng chọn file excel");

        setLoading(true);
        try {
            const formData = new FormData();

            formData.append("file", file);

            const res = await api.post("/subjects/import", formData, {
                headers: {
                    'Content-type': 'multipart/form-data',
                }
            });
            toast.success(res.data.message);
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error("Lỗi khi import dữ liệu");
        } finally {
            setLoading(false);
        }
    };
    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Import môn học từ Excel"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Hủy</Button>
                    <Button variant="primary" loading={loading} onClick={handleImport}>Bắt đầu Import</Button>
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
                        id="excel-upload"
                    />
                    <label htmlFor="excel-upload" className="cursor-pointer">
                        <div className="text-slate-500 mb-2">
                            {file ? <span className="text-blue-600 font-medium">{file.name}</span> : "Kéo thả hoặc click để chọn file Excel"}
                        </div>
                        <p className="text-xs text-slate-400">Hỗ trợ định dạng .xlsx, .xls</p>
                    </label>
                </div>
            </div>
        </Modal>
    )
}