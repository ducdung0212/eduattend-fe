"use client";

import { SearchBar } from "@/components/shared/SearchBar";
import { Pagination } from "@/components/shared/Pagination";
import { DataTable, Column } from "@/components/shared/DataTable";
import { usePagination } from "@/hooks/usePagination";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { ExamSchedule, PaginationMeta } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatTime, getDayOfWeekVN, formatDateShort } from "@/lib/utils";

const LIMIT = 20;

export default function ExamSchedulePage() {
    const { user, initializing } = useAuth();
    const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const { page, setPage } = usePagination(meta?.totalPages ?? 1);

    const COLUMNS: Column<ExamSchedule>[] = useMemo(() => [
        {
            key: "stt",
            label: "STT",
            align: "center",
            className: "w-[50px]",
            render: (_, index) => <span className="font-medium text-slate-500">{(page - 1) * LIMIT + index + 1}</span>,
        },
        {
            key: "subject_code",
            label: "Mã môn",
            render: (row) => (
                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-medium">
                    {row.subject?.subject_code}
                </span>
            ),
        },
        {
            key: "subject_name",
            label: "Tên môn",
            render: (row) => (
                <span className="font-medium text-slate-800 line-clamp-2">{row.subject?.name}</span>
            ),
        },
        {
            key: "group",
            label: "Nhóm",
            align: "center",
            className: "w-[60px]",
            render: (row) => (
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                    {row.group}
                </span>
            ),
        },
        {
            key: "dayOfWeek",
            label: "Thứ",
            align: "center",
            className: "w-[70px]",
            render: (row) => <span className="whitespace-nowrap">{getDayOfWeekVN(row.start_time)}</span>,
        },
        {
            key: "examDate",
            label: "Ngày thi",
            align: "center",
            render: (row) => <span className="font-medium whitespace-nowrap">{formatDateShort(row.start_time)}</span>,
        },
        {
            key: "examTime",
            label: "Giờ thi",
            align: "center",
            className: "w-[70px]",
            render: (row) => (
                <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-xs">
                    {formatTime(row.start_time)}
                </span>
            ),
        },
        {
            key: "duration",
            label: "Thời lượng",
            align: "center",
            className: "w-[90px]",
            render: (row) => (
                <span className="whitespace-nowrap">
                    <span className="text-xs">{row.duration} phút</span>
                </span>
            ),
        },
        {
            key: "room",
            label: "Phòng thi",
            render: (row) => (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold whitespace-nowrap">
                    <i className="ti ti-door text-sm" />
                    {row.room?.name}
                </span>
            ),
        },
        {
            key: "note",
            label: "Ghi chú",
            render: (row) =>
                row.note ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 text-xs">
                        <i className="ti ti-alert-circle text-xs" />
                        <span className="truncate max-w-[120px]">{row.note}</span>
                    </span>
                ) : (
                    <span className="text-slate-300">—</span>
                ),
        },
    ], [page]);

    const fetchExamSchedules = useCallback(async () => {
        if (!user?.student_code) return;
        setLoading(true);
        try {
            const res = await api.get("/exam-schedules", {
                params: {
                    page,
                    limit: LIMIT,
                    search: search || undefined,
                    student_code: user.student_code,
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
    }, [page, search, user?.student_code]);

    useEffect(() => {
        if (initializing) return;
        if (!user?.student_code) {
            setLoading(false);
            return;
        }
        const t = setTimeout(fetchExamSchedules, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchExamSchedules, search, user?.student_code, initializing]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-medium text-slate-900 tracking-tight">
                        Lịch thi của tôi
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Xem chi tiết lịch thi theo dạng bảng
                    </p>
                </div>
            </div>

            <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden shadow-sm">
                {/* Bộ lọc */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap bg-slate-50/50">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Tìm theo môn, phòng thi..."
                        className="flex-1 min-w-[200px] max-w-md"
                    />
                    {!loading && meta && (
                        <span className="text-xs text-slate-400 ml-auto">
                            {meta.total} ca thi
                        </span>
                    )}
                </div>

                {/* Table */}
                <DataTable<ExamSchedule>
                    columns={COLUMNS}
                    data={examSchedules}
                    loading={loading}
                    rowKey={(row) => row.id}
                    emptyText="Bạn không có ca thi nào sắp tới."
                />

                {/* Phân trang */}
                <Pagination
                    page={page}
                    limit={LIMIT}
                    total={meta?.total ?? 0}
                    totalPages={meta?.totalPages ?? 1}
                    onPageChange={setPage}
                />
            </div>
        </div>
    );
}