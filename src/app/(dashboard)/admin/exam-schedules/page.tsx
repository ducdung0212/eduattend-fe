"use client"

import { Column, DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { SearchBar } from "@/components/shared/SearchBar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { usePagination } from "@/hooks/usePagination";
import api from "@/lib/api";
import { ExamSchedule, PaginationMeta } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ExamScheduleFormModal } from "./_components/ExamScheduleFormModal";
import { formatDateTime } from "@/lib/utils";
import { ExamScheduleImportModal } from "./_components/ExamScheduleImportModal";
import { ExamSupervisorModal } from "./_components/ExamSupervisorModal";
import { AttendanceRecordModal } from "./_components/AttendanceRecordModal";

const LIMIT = 10;



export default function ExamScheduleManagementPage() {
    // --- State Modals ---
    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false); // State quản lý modal import
    const [attendanceRecordModal, setAttendanceRecordModal] = useState<ExamSchedule | null>(null);
    const [examSupervisorModal, setExamSupervisorModal] = useState<ExamSchedule | null>(null);
    const [editingExamSchedule, setEditingExamSchedule] = useState<ExamSchedule | null>(null);
    const [scheduleToDelete, setScheduleToDelete] = useState<ExamSchedule | null>(null);
    const [deleting, setDeleting] = useState(false);


    // --- State Data ---
    const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);

    // --- State Filters ---
    const [search, setSearch] = useState("");
    const [startTime, setStartTime] = useState(""); // Lọc theo ngày thi (yyyy-MM-dd)

    const { page, setPage, reset: resetPage } = usePagination(meta?.totalPages ?? 1);

    // Fetch danh sách lịch thi
    const fetchExamSchedules = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/exam-schedules", {
                params: {
                    page,
                    limit: LIMIT,
                    search: search || undefined,
                    start_time: startTime || undefined,
                },
            });
            setExamSchedules(res.data?.data ?? []);
            setMeta(res.data?.meta ?? null);
        } catch (e) {
            console.error("Lỗi khi tải danh sách lịch thi:", e);
            toast.error("Không thể tải danh sách lịch thi");
        } finally {
            setLoading(false);
        }
    }, [page, search, startTime]);

    // Debounce tìm kiếm
    useEffect(() => {
        const t = setTimeout(fetchExamSchedules, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchExamSchedules, search]);

    // --- Handlers ---
    const handleOpenModal = useCallback((s?: ExamSchedule) => {
        setEditingExamSchedule(s || null);
        setModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setModalOpen(false);
        setEditingExamSchedule(null);
    }, []);

    const handleSearch = (v: string) => {
        setSearch(v);
        resetPage();
    };

    const handleStartTimeChange = (v: string) => {
        setStartTime(v);
        resetPage();
    };

    const handleClearFilters = () => {
        setSearch("");
        setStartTime("");
        resetPage();
    };

    const hasActiveFilters = Boolean(search || startTime);

    const confirmDelete = async () => {
        if (!scheduleToDelete) return;
        setDeleting(true);
        try {
            await api.delete(`/exam-schedules/${scheduleToDelete.id}`);
            toast.success("Xóa lịch thi thành công");
            fetchExamSchedules();
            setScheduleToDelete(null);
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setDeleting(false);
        }
    };

    // --- Columns ---
    const columns: Column<ExamSchedule>[] = useMemo(() => [
        {
            key: "subject",
            label: "Môn học",
            render: (s) => (
                <div className="flex flex-col">
                    <span className="font-medium text-slate-900">{s.subject?.name}</span>
                    <span className="text-xs text-slate-500">{s.subject?.subject_code}</span>
                </div>
            ),
        },
        {
            key: "group",
            label: "Nhóm",
            render: (s) => (
                <span className="text-slate-700">Nhóm {s.group}</span>
            ),
        },
        {
            key: "start_time",
            label: "Thời gian bắt đầu",
            render: (s) => (
                <span className="text-slate-700">{formatDateTime(s.start_time)}</span>
            ),
        },
        {
            key: "duration",
            label: "Thời lượng",
            render: (s) => (
                <span className="text-slate-700">{s.duration} phút</span>
            ),
        },
        {
            key: "room",
            label: "Phòng thi",
            render: (s) => (
                <div className="flex flex-col">
                    <span className="font-medium text-slate-900">{s.room?.name}</span>
                    <span className="text-xs text-slate-500">{s.room?.room_code}</span>
                </div>
            ),
        },
        {
            key: "attendanceRecordTotals",
            label: "SL Thí sinh",
            render: (s) => (
                <span className="text-slate-700">{s.attendance_count} </span>
            ),
        },
        {
            key: "examSupervisorTotals",
            label: "SL Giám thị",
            render: (s) => (
                <span className="text-slate-700">{s.supervisor_count} </span>
            ),
        },
        {
            key: "note",
            label: "Ghi chú",
            render: (s) => (
                <span className="text-slate-500 text-sm">{s.note || "—"}</span>
            ),
        },
        {
            key: "actions",
            label: "Thao tác",
            align: "right",
            render: (s) => (
                <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" leftIcon="edit" onClick={() => handleOpenModal(s)}>
                        Sửa
                    </Button>
                    <Button size="sm" variant="danger" leftIcon="trash" onClick={() => setScheduleToDelete(s)}>
                        Xóa
                    </Button>
                    <Button size="sm" variant="secondary" leftIcon="users" onClick={() => setAttendanceRecordModal(s)}>
                        Thí sinh
                    </Button>
                    <Button size="sm" variant="secondary" leftIcon="user-check" onClick={() => setExamSupervisorModal(s)}>
                        Giám thị
                    </Button>
                </div>
            ),
        },
    ], [handleOpenModal]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-medium text-slate-900 tracking-tight">
                        Quản lý lịch thi
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Tổng quan và quản lý lịch thi trong hệ thống
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" leftIcon="upload" onClick={() => setImportModalOpen(true)}>
                        Import Excel
                    </Button>
                    <Button variant="primary" leftIcon="plus" onClick={() => handleOpenModal()}>
                        Thêm lịch thi
                    </Button>
                </div>
            </div>

            <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
                {/* Bộ lọc */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap bg-slate-50/50">
                    <SearchBar
                        value={search}
                        onChange={handleSearch}
                        placeholder="Tìm theo tên môn, mã môn, phòng thi..."
                        className="flex-1 min-w-[200px]"
                    />
                    <div className="flex items-center gap-2">
                        <label htmlFor="exam-start-time-filter" className="text-sm text-slate-500 whitespace-nowrap">
                            Ngày thi
                        </label>
                        <input
                            id="exam-start-time-filter"
                            type="date"
                            value={startTime}
                            onChange={(e) => handleStartTimeChange(e.target.value)}
                            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        />
                    </div>
                    {hasActiveFilters && (
                        <Button size="sm" variant="secondary" leftIcon="x" onClick={handleClearFilters}>
                            Xóa lọc
                        </Button>
                    )}
                </div>

                {/* Bảng dữ liệu */}
                <DataTable<ExamSchedule>
                    columns={columns}
                    data={examSchedules}
                    loading={loading}
                    rowKey={(s) => s.id}
                    skeletonRows={LIMIT}
                    emptyText="Không tìm thấy lịch thi nào phù hợp."
                />

                {/* Phân trang */}
                <Pagination
                    page={page}
                    totalPages={meta?.totalPages ?? 1}
                    total={meta?.total ?? 0}
                    limit={LIMIT}
                    onPageChange={setPage}
                />
            </div>

            {/* Modals */}
            <ExamScheduleFormModal
                open={modalOpen}
                onClose={handleCloseModal}
                examSchedule={editingExamSchedule}
                onSuccess={fetchExamSchedules}
            />
            <ExamScheduleImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={fetchExamSchedules}
            />
            <ExamSupervisorModal
                open={!!examSupervisorModal}
                examSchedule={examSupervisorModal}
                onClose={() => setExamSupervisorModal(null)}
            />
            <AttendanceRecordModal
                open={!!attendanceRecordModal}
                examSchedule={attendanceRecordModal}
                onClose={() => setAttendanceRecordModal(null)}
            />

            <Modal
                open={!!scheduleToDelete}
                onClose={() => setScheduleToDelete(null)}
                title="Xác nhận xóa"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setScheduleToDelete(null)}>
                            Hủy
                        </Button>
                        <Button variant="danger" loading={deleting} onClick={confirmDelete}>
                            Xóa
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600">
                    Bạn có chắc chắn muốn xóa lịch thi môn{" "}
                    <span className="font-semibold text-slate-900">
                        {scheduleToDelete?.subject?.name}
                    </span>{" "}
                    nhóm <span className="font-semibold text-slate-900">{scheduleToDelete?.group}</span> không? Hành động này không thể hoàn tác.
                </p>
            </Modal>
        </div>
    );
}