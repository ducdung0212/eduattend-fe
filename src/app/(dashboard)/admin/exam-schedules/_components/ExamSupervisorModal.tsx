'use client';

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { ExamSchedule, ExamSupervisor } from "@/types";
import { useCallback, useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";

interface ExamSupervisorModalProps {
    open: boolean;
    examSchedule: ExamSchedule | null;
    onClose: () => void;
    onSuccess?: () => void;
}

export function ExamSupervisorModal({ open, examSchedule, onClose, onSuccess }: ExamSupervisorModalProps) {
    const [records, setRecords] = useState<ExamSupervisor[]>([]);
    const [loading, setLoading] = useState(false);

    // Combobox state
    const [lecturerSearch, setLecturerSearch] = useState("");
    const [lecturerOptions, setLecturerOptions] = useState<any[]>([]);
    const [isSearchingLecturer, setIsSearchingLecturer] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const examScheduleId = examSchedule?.id;

    // --- Fetch danh sách giám thị CỦA CA THI NÀY ---
    const fetchSupervisors = useCallback(async () => {
        if (!examScheduleId) return;
        setLoading(true);
        try {
            const res = await api.get("/exam-supervisors", {
                params: {
                    exam_schedule_id: examScheduleId,
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
    }, [examScheduleId]);

    // Reset state khi mở modal
    useEffect(() => {
        if (!open) {
            setRecords([]);
            setLecturerSearch("");
            setLecturerOptions([]);
            setShowDropdown(false);
            return;
        }
        fetchSupervisors();
    }, [open, fetchSupervisors]);

    // --- Xử lý click ra ngoài để đóng dropdown ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Tìm kiếm giảng viên (Debounce) ---
    useEffect(() => {
        if (!lecturerSearch.trim()) {
            setLecturerOptions([]);
            setIsSearchingLecturer(false);
            return;
        }

        const t = setTimeout(async () => {
            setIsSearchingLecturer(true);
            try {
                const res = await api.get("/lecturers", {
                    params: { search: lecturerSearch, limit: 10 },
                });
                setLecturerOptions(res.data?.data || []);
                setShowDropdown(true);
            } catch (error) {
                console.error("Lỗi tìm giảng viên:", error);
            } finally {
                setIsSearchingLecturer(false);
            }
        }, 400);

        return () => clearTimeout(t);
    }, [lecturerSearch]);

    // --- Thêm giám thị ---
    const handleSelectLecturer = async (lecturer: any) => {
        if (!examScheduleId) return;

        // Đóng dropdown và xóa text search
        setShowDropdown(false);
        setLecturerSearch("");

        try {
            const res = await api.post("/exam-supervisors/bulk", {
                exam_schedule_id: examScheduleId,
                lecturer_codes: [lecturer.lecturer_code],
            });

            const success: { lecturer_code: string; id: string }[] = res.data?.data?.success ?? [];
            const failed: { lecturer_code: string; reason: string }[] = res.data?.data?.failed ?? [];

            if (success.length > 0) {
                toast.success(`Đã thêm ${lecturer.last_name} ${lecturer.first_name}`);
                fetchSupervisors();
                onSuccess?.();
            }
            
            failed.forEach((f) => {
                toast.error(`${f.lecturer_code}: ${f.reason}`);
            });

        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        }
    };

    // --- Xóa giám thị ---
    const handleDelete = async (record: ExamSupervisor) => {
        try {
            await api.delete(`/exam-supervisors/${record.id}`);
            toast.success("Đã xóa giám thị");
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
            title="Quản lý giám thị coi thi"
            size="lg"
            footer={
                <Button variant="secondary" onClick={onClose}>
                    Đóng
                </Button>
            }
        >
            <div className="space-y-4" style={{ minHeight: '350px' }}>
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

                {/* Combobox Tìm & Thêm giảng viên */}
                <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
                    <label className="text-sm font-medium text-slate-700">
                        Thêm giám thị
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <i className="ti ti-search text-slate-400" />
                        </div>
                        <input
                            type="text"
                            value={lecturerSearch}
                            onChange={(e) => {
                                setLecturerSearch(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => {
                                if (lecturerOptions.length > 0) setShowDropdown(true);
                            }}
                            placeholder="Nhập mã hoặc tên giảng viên..."
                            className="w-full rounded-lg border text-sm text-slate-900 bg-white h-10 pl-9 pr-4 outline-none transition-colors border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        />
                        {isSearchingLecturer && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <span className="w-4 h-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Dropdown danh sách giảng viên */}
                    {showDropdown && lecturerSearch.trim() && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                            {lecturerOptions.length > 0 ? (
                                <ul className="py-1">
                                    {lecturerOptions.map((lecturer) => (
                                        <li
                                            key={lecturer.lecturer_code}
                                            onClick={() => handleSelectLecturer(lecturer)}
                                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b border-slate-50 last:border-0"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                                <i className="ti ti-user text-blue-600" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">
                                                    {lecturer.last_name} {lecturer.first_name}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {lecturer.lecturer_code} • {lecturer.faculty?.name}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : !isSearchingLecturer ? (
                                <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                    Không tìm thấy giảng viên nào
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>

                {/* Danh sách giám thị đã thêm */}
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr className="text-left text-slate-500">
                                <th className="px-3 py-2 font-medium">Mã GV</th>
                                <th className="px-3 py-2 font-medium">Họ tên</th>
                                <th className="px-3 py-2 font-medium text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                                        Đang tải...
                                    </td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
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