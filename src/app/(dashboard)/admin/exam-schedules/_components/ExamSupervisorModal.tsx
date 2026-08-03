'use client';

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { DataTable, Column } from "@/components/shared/DataTable";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { ExamSchedule, ExamSupervisor } from "@/types";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
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

    // --- Xóa nhiều giám thị ---
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    const handleBulkDelete = async () => {
        if (selectedKeys.length === 0) return;
        if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedKeys.length} giám thị đã chọn khỏi ca thi không?`)) return;

        setBulkDeleting(true);
        try {
            const res = await api.post("/exam-supervisors/bulk-delete", { ids: selectedKeys });
            const { success, failed, errors } = res.data.data;
            if (failed > 0) {
                toast.error(`Xóa thành công ${success}, thất bại ${failed}`);
                console.error("Bulk delete errors:", errors);
            } else {
                toast.success(`Đã xóa thành công ${success} giám thị`);
            }
            setSelectedKeys([]);
            fetchSupervisors();
            onSuccess?.();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Lỗi khi xóa nhiều giám thị");
        } finally {
            setBulkDeleting(false);
        }
    };

    const columns: Column<ExamSupervisor>[] = useMemo(() => [
        {
            key: "lecturer_code",
            label: "Mã GV",
            render: (r) => <span className="font-medium text-slate-900">{r.lecturer?.lecturer_code}</span>,
        },
        {
            key: "name",
            label: "Họ tên",
            render: (r) => <span className="text-slate-700">{r.lecturer?.last_name} {r.lecturer?.first_name}</span>,
        },
        {
            key: "actions",
            label: "Thao tác",
            align: "right",
            render: (r) => (
                <div className="flex justify-end">
                    <Button size="sm" variant="danger" leftIcon="trash" onClick={() => handleDelete(r)}>
                        Xóa
                    </Button>
                </div>
            ),
        }
    ], []);

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
                    <div className="relative">
                        <Input
                            label="Thêm giám thị"
                            leftIcon="search"
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
                            className="pr-10"
                        />
                        {isSearchingLecturer && (
                            <div className="absolute right-3 top-[34px] flex items-center">
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
                <div className="flex justify-between items-center mt-4 mb-2">
                    <h4 className="text-sm font-medium text-slate-800">Giám thị đã phân công</h4>
                    {selectedKeys.length > 0 && (
                        <Button variant="danger" size="sm" leftIcon="trash" onClick={handleBulkDelete} loading={bulkDeleting}>
                            Xóa {selectedKeys.length} mục
                        </Button>
                    )}
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                    <DataTable<ExamSupervisor>
                        columns={columns}
                        data={records}
                        loading={loading}
                        rowKey={(r) => r.id}
                        emptyText="Chưa có giám thị nào cho ca thi này"
                        selectable={true}
                        selectedRowKeys={selectedKeys}
                        onSelectChange={setSelectedKeys}
                    />
                </div>
            </div>
        </Modal>
    );
}