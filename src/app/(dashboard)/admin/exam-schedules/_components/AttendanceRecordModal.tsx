'use client';

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/shared/Pagination";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { ExamSchedule, AttendanceRecord } from "@/types";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

interface AttendanceRecordModalProps {
    open: boolean;
    examSchedule: ExamSchedule | null;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AttendanceRecordModal({ open, examSchedule, onClose, onSuccess }: AttendanceRecordModalProps) {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

    const [search, setSearch] = useState("");
    const [codesInput, setCodesInput] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const examScheduleId = examSchedule?.id;

    // --- Fetch danh sách sinh viên của ca thi này ---
    const fetchRecords = useCallback(async () => {
        if (!examScheduleId) return;
        setLoading(true);
        try {
            const res = await api.get("/attendance-records", {
                params: {
                    exam_schedule_id: examScheduleId,
                    search: search || undefined,
                    page,
                    limit: 10,
                },
            });
            setRecords(res.data?.data ?? []);
            setMeta(res.data?.meta ?? { total: 0, totalPages: 1 });
        } catch (e) {
            console.error("Lỗi khi tải danh sách sinh viên:", e);
            toast.error("Không thể tải danh sách sinh viên");
        } finally {
            setLoading(false);
        }
    }, [examScheduleId, search, page]);

    // Debounce tìm kiếm + reset khi mở modal
    useEffect(() => {
        if (!open) {
            setSearch("");
            setPage(1);
            setCodesInput("");
            setRecords([]);
            return;
        }
        const t = setTimeout(fetchRecords, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [open, fetchRecords, search, page]);

    // --- Thêm sinh viên (1 hoặc nhiều mã SV) ---
    const handleAdd = async () => {
        if (!examScheduleId) return;

        const codes = Array.from(
            new Set(
                codesInput
                    .split(/[\s,;]+/)
                    .map((c) => c.trim().toUpperCase())
                    .filter(Boolean)
            )
        );

        if (codes.length === 0) {
            return toast.error("Vui lòng nhập mã số sinh viên");
        }

        setSubmitting(true);
        try {
            const res = await api.post("/attendance-records/bulk", {
                exam_schedule_id: examScheduleId,
                student_codes: codes,
            });

            const success: { student_code: string; id: string }[] = res.data?.data?.success ?? [];
            const failed: { student_code: string; reason: string }[] = res.data?.data?.failed ?? [];

            if (success.length > 0) {
                toast.success(`Đã thêm ${success.length} sinh viên thành công`);
            }
            
            if (failed.length > 5) {
                toast.error(`Có ${failed.length} sinh viên bị lỗi, không thể thêm vào ca thi.`);
                setTimeout(() => {
                    if (window.confirm(`Có ${failed.length} sinh viên bị lỗi khi thêm vào ca thi. Bạn có muốn tải xuống file Excel chứa chi tiết lỗi không?`)) {
                        try {
                            const data = [["Mã SV", "Lỗi chi tiết"]];
                            failed.forEach((f) => {
                                data.push([f.student_code, f.reason]);
                            });
                            const newWorksheet = XLSX.utils.aoa_to_sheet(data);
                            const newWorkbook = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Errors");
                            XLSX.writeFile(newWorkbook, `Danh_sach_loi_them_sinh_vien_ca_thi_${new Date().getTime()}.xlsx`);
                        } catch (e) {
                            console.error("Lỗi khi tạo file excel chứa lỗi:", e);
                        }
                    }
                }, 100);
            } else {
                failed.forEach((f) => {
                    toast.error(`${f.student_code}: ${f.reason}`);
                });
            }

            if (success.length > 0) {
                setCodesInput("");
                fetchRecords();
                onSuccess?.();
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setSubmitting(false);
        }
    };

    // --- Xóa sinh viên khỏi ca thi ---
    const handleDelete = async (record: AttendanceRecord) => {
        try {
            await api.delete(`/attendance-records/${record.id}`);
            toast.success("Đã xóa sinh viên khỏi danh sách");
            setRecords((prev) => prev.filter((r) => r.id !== record.id));
            onSuccess?.();
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Quản lý danh sách thi"
            size="lg"
            footer={
                <Button variant="secondary" onClick={onClose}>
                    Đóng
                </Button>
            }
        >
            <div className="space-y-4">
                {/* Thông tin ca thi */}
                {examSchedule && (
                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">
                            {examSchedule.subject?.name}{" "}
                            <span className="text-slate-500">({examSchedule.subject?.subject_code})</span>
                            {" — "}Nhóm {examSchedule.group}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {formatDateTime(examSchedule.start_time)} • Phòng {examSchedule.room?.name}
                        </p>
                    </div>
                )}

                {/* Form thêm sinh viên */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                        Thêm sinh viên (mã số sinh viên)
                    </label>
                    <div className="flex gap-2">
                        <textarea
                            value={codesInput}
                            onChange={(e) => setCodesInput(e.target.value)}
                            placeholder="Nhập mã số sinh viên, có thể nhập nhiều mã cách nhau bởi dấu phẩy, khoảng trắng hoặc xuống dòng. Ví dụ: DH52200500, DH52200200"
                            rows={2}
                            className="flex-1 rounded-lg border text-sm text-slate-900 bg-white px-3 py-2 outline-none transition-colors border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 resize-none"
                        />
                        <Button
                            variant="primary"
                            loading={submitting}
                            onClick={handleAdd}
                            className="self-stretch"
                        >
                            Thêm
                        </Button>
                    </div>
                </div>

                {/* Tìm kiếm */}
                <Input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Tìm theo mã SV, họ tên..."
                />

                {/* Danh sách sinh viên */}
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                            <tr className="text-left text-slate-500">
                                <th className="px-3 py-2 font-medium">Mã SV</th>
                                <th className="px-3 py-2 font-medium">Họ tên</th>
                                <th className="px-3 py-2 font-medium">Lớp</th>
                                <th className="px-3 py-2 font-medium text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                                        Đang tải...
                                    </td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                                        Chưa có sinh viên nào trong danh sách thi này
                                    </td>
                                </tr>
                            ) : (
                                records.map((r) => (
                                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                                        <td className="px-3 py-2 font-medium text-slate-900">
                                            {r.student?.student_code}
                                        </td>
                                        <td className="px-3 py-2 text-slate-700">
                                            {r.student?.last_name} {r.student?.first_name}
                                        </td>
                                        <td className="px-3 py-2 text-slate-500">
                                            {r.student?.class?.name || r.student?.class?.class_code || "—"}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <Button size="sm" variant="danger" leftIcon="trash" onClick={() => handleDelete(r)}>
                                                Xóa
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {meta.totalPages > 1 && (
                    <Pagination
                        page={page}
                        totalPages={meta.totalPages}
                        total={meta.total}
                        limit={10}
                        onPageChange={setPage}
                    />
                )}
            </div>
        </Modal>
    );
}