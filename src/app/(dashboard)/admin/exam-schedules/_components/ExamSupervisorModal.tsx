'use client';

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { ExamSchedule, ExamSupervisor } from "@/types";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";


interface ExamSupervisorModalProps {
    open: boolean;
    examSchedule: ExamSchedule | null;
    onClose: () => void;
}

export function ExamSupervisorModal({ open, examSchedule, onClose }: ExamSupervisorModalProps) {
    const [records, setRecords] = useState<ExamSupervisor[]>([]);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [codesInput, setCodesInput] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const examScheduleId = examSchedule?.id;

    // --- Fetch danh sách giám thị của ca thi này ---
    const fetchSupervisors = useCallback(async () => {
        if (!examScheduleId) return;
        setLoading(true);
        try {
            const res = await api.get("/exam-supervisors", {
                params: {
                    exam_schedule_id: examScheduleId,
                    search: search || undefined,
                    limit: 100,
                },
            });
            setRecords(res.data?.data ?? []);
        } catch (e) {
            console.error("Lỗi khi tải danh sách giám thị:", e);
            toast.error("Không thể tải danh sách giám thị");
        } finally {
            setLoading(false);
        }
    }, [examScheduleId, search]);

    // Debounce tìm kiếm + reset khi mở modal
    useEffect(() => {
        if (!open) {
            setSearch("");
            setCodesInput("");
            setRecords([]);
            return;
        }
        const t = setTimeout(fetchSupervisors, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [open, fetchSupervisors, search]);

    // --- Thêm giám thị (1 hoặc nhiều mã GV) ---
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
            return toast.error("Vui lòng nhập mã số giảng viên");
        }

        setSubmitting(true);
        try {
            const res = await api.post("/exam-supervisors/bulk", {
                exam_schedule_id: examScheduleId,
                lecturer_codes: codes,
            });

            const success: { lecturer_code: string; id: string }[] = res.data?.data?.success ?? [];
            const failed: { lecturer_code: string; reason: string }[] = res.data?.data?.failed ?? [];

            if (success.length > 0) {
                toast.success(`Đã thêm ${success.length} giám thị thành công`);
            }
            failed.forEach((f) => {
                toast.error(`${f.lecturer_code}: ${f.reason}`);
            });

            if (success.length > 0) {
                setCodesInput("");
                fetchSupervisors();
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setSubmitting(false);
        }
    };

    // --- Xóa giám thị ---
    const handleDelete = async (record: ExamSupervisor) => {
        try {
            await api.delete(`/exam-supervisors/${record.id}`);
            toast.success("Đã xóa giám thị");
            setRecords((prev) => prev.filter((r) => r.id !== record.id));
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Quản lý giám thị coi thi"
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

                {/* Form thêm giám thị */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                        Thêm giám thị (mã số giảng viên)
                    </label>
                    <div className="flex gap-2">
                        <textarea
                            value={codesInput}
                            onChange={(e) => setCodesInput(e.target.value)}
                            placeholder="Nhập mã số giảng viên, có thể nhập nhiều mã cách nhau bởi dấu phẩy, khoảng trắng hoặc xuống dòng. Ví dụ: GV001, GV002"
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
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo mã GV, họ tên..."
                    className="w-full rounded-lg border text-sm text-slate-900 bg-white h-9 px-3 outline-none transition-colors border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />

                {/* Danh sách giám thị */}
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr className="text-left text-slate-500">
                                <th className="px-3 py-2 font-medium">Mã GV</th>
                                <th className="px-3 py-2 font-medium">Họ tên</th>
                                <th className="px-3 py-2 font-medium">Khoa</th>
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
                                        Chưa có giám thị nào cho ca thi này
                                    </td>
                                </tr>
                            ) : (
                                records.map((r) => (
                                    <tr key={r.id} className="border-t border-slate-100">
                                        <td className="px-3 py-2 font-medium text-slate-900">{r.lecturer.lecturer_code}</td>
                                        <td className="px-3 py-2 text-slate-700">
                                            {r.lecturer?.last_name} {r.lecturer?.first_name}
                                        </td>
                                        <td className="px-3 py-2 text-slate-500">{r.lecturer.faculty.name}</td>
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
            </div>
        </Modal>
    );
}