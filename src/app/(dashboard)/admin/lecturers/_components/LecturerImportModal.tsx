"use client";
import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import api from "@/lib/api";
import toast from "react-hot-toast";

export function LecturerImportModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [createAccount, setCreateAccount] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleImport = async () => {
        if (!file) return toast.error("Vui lòng chọn file excel");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("create_account", String(createAccount));

        setLoading(true);
        try {
            const res = await api.post("/lecturers/import", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data', // Ép axios nhận dạng form data
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
            title="Import giảng viên từ Excel"
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

                <label className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl cursor-pointer">
                    <input
                        type="checkbox"
                        checked={createAccount}
                        onChange={(e) => setCreateAccount(e.target.checked)}
                        className="w-5 h-5 rounded border-blue-300 text-blue-600"
                    />
                    <div>
                        <p className="text-sm font-semibold text-blue-900">Tự động tạo tài khoản</p>
                        <p className="text-xs text-blue-700">Hệ thống sẽ tạo tài khoản cho các giảng viên mới trong file</p>
                    </div>
                </label>
            </div>
        </Modal>
    );
}