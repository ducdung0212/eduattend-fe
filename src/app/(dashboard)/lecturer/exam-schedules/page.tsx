'use client'

import { Column, DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { SearchBar } from "@/components/shared/SearchBar";
import { usePagination } from "@/hooks/usePagination";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { ExamSchedule, PaginationMeta } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";

const LIMIT = 10;

export default function ExamSchedulePage() {
    const { user, initializing } = useAuth();

    const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [startTime, setStartTime] = useState("");

    const { page, setPage, reset: resetPage } = usePagination(meta?.totalPages ?? 1);

    const fetchExamSchedules = useCallback(async () => {
        if (!user?.lecturer_code) return;

        setLoading(true);
        try {
            const res = await api.get("/exam-schedules", {
                params: {
                    page,
                    limit: LIMIT,
                    search: search || undefined,
                    lecturer_code: user.lecturer_code,
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
    }, [page, search, user?.lecturer_code, startTime]);

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
    useEffect(() => {
        if (initializing) return;
        if (!user?.lecturer_code) {
            setLoading(false);
            return;
        }
        const t = setTimeout(fetchExamSchedules, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchExamSchedules, search, user?.lecturer_code, initializing]);

    const handleSearch = (v: string) => {
        setSearch(v);
        resetPage();
    };
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
    ], []);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-medium text-slate-900 tracking-tight">
                        Lịch thi của tôi
                    </h1>
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
                </div>

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
        </div>
    );
}