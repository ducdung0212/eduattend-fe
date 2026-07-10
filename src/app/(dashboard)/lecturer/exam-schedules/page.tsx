"use client";

import { SearchBar } from "@/components/shared/SearchBar";
import { DataTable, Column } from "@/components/shared/DataTable";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { ExamSchedule } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatTime, getDayOfWeekVN, formatDateShort } from "@/lib/utils";

const LIMIT = 100;

/** Represents a single row in the table (one class within one exam schedule) */
interface ExamTableRow {
    scheduleId: string;
    subjectCode: string;
    subjectName: string;
    group: number;
    className: string;
    studentCount: number;
    dayOfWeek: string;
    examDate: string;
    examTime: string;
    room: string;
    supervisors: string[];
    note: string;
    _idx: number; // for unique key when flattened
}

function flattenSchedules(schedules: ExamSchedule[]): ExamTableRow[] {
    const rows: ExamTableRow[] = [];
    let idx = 0;
    for (const s of schedules) {
        const classBreakdown = s.class_breakdown ?? [];
        if (classBreakdown.length === 0) {
            rows.push({
                scheduleId: s.id,
                subjectCode: s.subject?.subject_code ?? "",
                subjectName: s.subject?.name ?? "",
                group: s.group,
                className: "—",
                studentCount: s.attendance_count ?? 0,
                dayOfWeek: getDayOfWeekVN(s.start_time),
                examDate: formatDateShort(s.start_time),
                examTime: formatTime(s.start_time),
                room: s.room?.name ?? "",
                supervisors: s.supervisors ?? [],
                note: s.note ?? "",
                _idx: idx++,
            });
        } else {
            for (const cls of classBreakdown) {
                rows.push({
                    scheduleId: s.id,
                    subjectCode: s.subject?.subject_code ?? "",
                    subjectName: s.subject?.name ?? "",
                    group: s.group,
                    className: cls.class_name,
                    studentCount: cls.student_count,
                    dayOfWeek: getDayOfWeekVN(s.start_time),
                    examDate: formatDateShort(s.start_time),
                    examTime: formatTime(s.start_time),
                    room: s.room?.name ?? "",
                    supervisors: s.supervisors ?? [],
                    note: s.note ?? "",
                    _idx: idx++,
                });
            }
        }
    }
    return rows;
}

const COLUMNS: Column<ExamTableRow>[] = [
    {
        key: "stt",
        label: "STT",
        align: "center",
        className: "w-[50px]",
        render: (_, index) => <span className="font-medium text-slate-500">{index + 1}</span>,
    },
    {
        key: "subjectCode",
        label: "Mã môn",
        render: (row) => (
            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-medium">
                {row.subjectCode}
            </span>
        ),
    },
    {
        key: "subjectName",
        label: "Tên môn",
        render: (row) => (
            <span className="font-medium text-slate-800 line-clamp-2">{row.subjectName}</span>
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
        key: "className",
        label: "Lớp",
        render: (row) => <span className="whitespace-nowrap">{row.className}</span>,
    },
    {
        key: "studentCount",
        label: "SL SV",
        align: "center",
        className: "w-[60px]",
        render: (row) => (
            <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                <i className="ti ti-users text-slate-400 text-xs" />
                {row.studentCount}
            </span>
        ),
    },
    {
        key: "dayOfWeek",
        label: "Thứ",
        align: "center",
        className: "w-[70px]",
    },
    {
        key: "examDate",
        label: "Ngày thi",
        align: "center",
        render: (row) => <span className="font-medium whitespace-nowrap">{row.examDate}</span>,
    },
    {
        key: "examTime",
        label: "Giờ thi",
        align: "center",
        className: "w-[70px]",
        render: (row) => (
            <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-xs">
                {row.examTime}
            </span>
        ),
    },
    {
        key: "room",
        label: "Phòng thi",
        render: (row) => (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold whitespace-nowrap">
                <i className="ti ti-door text-sm" />
                {row.room}
            </span>
        ),
    },
    {
        key: "supervisors",
        label: "CB coi thi",
        render: (row) =>
            row.supervisors.length > 0 ? (
                <div className="flex flex-col gap-0.5 text-xs">
                    {row.supervisors.map((sv, i) => (
                        <span key={i} className="whitespace-nowrap">{sv}</span>
                    ))}
                </div>
            ) : (
                <span className="text-slate-300">—</span>
            ),
    },
];

export default function ExamSchedulePage() {
    const { user, initializing } = useAuth();
    const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchExamSchedules = useCallback(async () => {
        if (!user?.lecturer_code) return;
        setLoading(true);
        try {
            const res = await api.get("/exam-schedules", {
                params: {
                    limit: LIMIT,
                    search: search || undefined,
                    lecturer_code: user.lecturer_code,
                },
            });
            setExamSchedules(res.data?.data ?? []);
        } catch (e) {
            console.error("Lỗi khi tải danh sách lịch thi:", e);
            toast.error("Không thể tải danh sách lịch thi");
        } finally {
            setLoading(false);
        }
    }, [search, user?.lecturer_code]);

    useEffect(() => {
        if (initializing) return;
        if (!user?.lecturer_code) {
            setLoading(false);
            return;
        }
        const t = setTimeout(fetchExamSchedules, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchExamSchedules, search, user?.lecturer_code, initializing]);

    const tableRows = useMemo(() => flattenSchedules(examSchedules), [examSchedules]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-medium text-slate-900 tracking-tight">
                        Lịch coi thi
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
                    {!loading && (
                        <span className="text-xs text-slate-400 ml-auto">
                            {examSchedules.length} ca thi · {tableRows.length} dòng
                        </span>
                    )}
                </div>

                {/* Table */}
                <DataTable<ExamTableRow>
                    columns={COLUMNS}
                    data={tableRows}
                    loading={loading}
                    rowKey={(row) => `${row.scheduleId}-${row._idx}`}
                    emptyText="Không có lịch coi thi nào."
                />
            </div>
        </div>
    );
}