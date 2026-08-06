"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

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
            // eslint-disable-next-line react-hooks/rules-of-hooks, react-hooks/exhaustive-deps
            setFile(null);
        }
    }, [open]);

    const handleErrorsAndDownload = async (file: File, rawErrors: { row: number, error: string }[]) => {
        if (!rawErrors || rawErrors.length === 0) return;

        if (!window.confirm("Có lỗi xảy ra trong quá trình Import. Bạn có muốn tải xuống file Excel chứa chi tiết các dòng lỗi không?")) {
            return;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (data.length > 0) {
                data[0].push("Lỗi chi tiết");
            }

            const errorColIndex = data.length > 0 ? data[0].length - 1 : 0;

            const errorMap = new Map();
            const generalErrors: string[] = [];
            rawErrors.forEach(err => {
                if (err.row > 0) {
                    const index = err.row - 1;
                    if (errorMap.has(index)) {
                        errorMap.set(index, errorMap.get(index) + "; " + err.error);
                    } else {
                        errorMap.set(index, err.error);
                    }
                } else {
                    generalErrors.push(err.error);
                }
            });

            const newData: any[][] = [];
            if (data.length > 0) {
                newData.push(data[0]); // Push header
            }

            for (let i = 1; i < data.length; i++) {
                if (errorMap.has(i)) {
                    while (data[i].length < errorColIndex) {
                        data[i].push("");
                    }
                    data[i][errorColIndex] = errorMap.get(i);
                    newData.push(data[i]);
                }
            }

            if (generalErrors.length > 0) {
                newData.push([]);
                newData.push(["Các lỗi chung không xác định dòng:"]);
                generalErrors.forEach(err => {
                    newData.push([err]);
                });
            }

            const newWorksheet = XLSX.utils.aoa_to_sheet(newData);
            
            // Auto-fit column widths
            if (newData.length > 0) {
                const colWidths = newData[0].map((_, colIndex) => {
                    const max = Math.max(...newData.map(row => {
                        const val = row[colIndex];
                        return val ? val.toString().length : 10;
                    }));
                    return { wch: Math.min(max + 2, 100) };
                });
                newWorksheet['!cols'] = colWidths;
            }

            const newWorkbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Errors");

            XLSX.writeFile(newWorkbook, `Danh_sach_loi_import_${new Date().getTime()}.xlsx`);
        } catch (e) {
            console.error("Lỗi khi tạo file excel chứa lỗi:", e);
        }
    };

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
            
            const rawErrors = res.data?.data?.rawErrors || res.data?.rawErrors;
            if (rawErrors && rawErrors.length > 0) {
                toast.error(res.data?.message || "Import hoàn tất với một số lỗi");
                setTimeout(async () => {
                    await handleErrorsAndDownload(file, rawErrors);
                }, 100);
            } else {
                toast.success(res.data?.message || "Import thành công");
            }
            onSuccess();
            onClose();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            const msg = err.response?.data?.message || "Lỗi khi import dữ liệu";
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
            
            const rawErrors = err.response?.data?.data?.rawErrors;
            if (rawErrors && rawErrors.length > 0) {
                setTimeout(async () => {
                    await handleErrorsAndDownload(file, rawErrors);
                }, 100);
            }
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
