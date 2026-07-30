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

const LIMIT = 5;

// Component renders class breakdown when row is expanded
const renderExpandedRow = (row: ExamSchedule) => {
    if (!row.class_breakdown || row.class_breakdown.length === 0) {
        return <div className="px-6 py-4 text-sm text-slate-500 italic text-center">Không có thông tin chi tiết lớp học.</div>;
    }
    return (
        <div className="px-6 py-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 tracking-wide">
                Chi tiết sinh viên ({row.class_breakdown.length} lớp)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {row.class_breakdown.map((cls, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:border-slate-300 transition-colors">
                        <span className="text-sm font-medium text-slate-700">{cls.class_name}</span>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                            <i className="ti ti-users" /> {cls.student_count} SV
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

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
            key: "subjectCode",
            label: "Mã môn",
            render: (row) => (
                <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-medium">
                    {row.subject?.subject_code}
                </span>
            ),
        },
        {
            key: "subjectName",
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
            key: "studentCount",
            label: "Tổng SV",
            align: "center",
            className: "w-[80px]",
            render: (row) => (
                <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                    <i className="ti ti-users text-slate-400 text-xs" />
                    {row.attendance_count ?? 0}
                </span>
            ),
        },
        {
            key: "dayOfWeek",
            label: "Thứ",
            align: "center",
            className: "w-[70px]",
            render: (row) => <span className="text-slate-600">{getDayOfWeekVN(row.start_time)}</span>
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
                <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-xs whitespace-nowrap">
                    {formatTime(row.start_time)}
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
            key: "supervisors",
            label: "CB coi thi",
            render: (row) =>
                row.supervisors && row.supervisors.length > 0 ? (
                    <div className="flex flex-col gap-0.5 text-xs">
                        {row.supervisors.map((sv, i) => (
                            <span key={i} className="whitespace-nowrap">{sv}</span>
                        ))}
                    </div>
                ) : (
                    <span className="text-slate-300">—</span>
                ),
        },
        {
            key: "expand",
            label: "",
            align: "center",
            className: "w-[40px]",
            render: () => <i className="ti ti-chevron-down text-slate-400" />
        }
    ], [page]);

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
    }, [page, search, user?.lecturer_code]);

    useEffect(() => {
        if (initializing) return;
        if (!user?.lecturer_code) {
            setLoading(false);
            return;
        }
        const t = setTimeout(fetchExamSchedules, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchExamSchedules, search, user?.lecturer_code, initializing]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-medium text-slate-900 tracking-tight">
                        Lịch gác thi
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Xem chi tiết lịch coi thi theo dạng bảng
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
                    emptyText="Không có lịch coi thi nào."
                    expandable={true}
                    expandedRowRender={renderExpandedRow}
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