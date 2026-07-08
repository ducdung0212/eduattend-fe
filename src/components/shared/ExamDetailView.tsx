"use client";

import { CheckInCameraView } from "./CheckInCameraView";
import { Pagination } from "@/components/shared/Pagination";
import { usePagination } from "@/hooks/usePagination";

import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/shared/SearchBar";
import api from "@/lib/api";
import { formatTime, formatDateTime, todayString } from "@/lib/utils";
import { ExamSchedule, AttendanceRecord, ExamSupervisor } from "@/types";
import { useCallback, useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";

interface Props {
    schedule: ExamSchedule;
    onBack: () => void;
}

export function ExamDetailView({ schedule, onBack }: Props) {
    // ── Chi tiết ca thi ──────────────────────────────
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [supervisors, setSupervisors] = useState<ExamSupervisor[]>([]);
    const [loadingRecords, setLoadingRecords] = useState(true);
    const [loadingSupervisors, setLoadingSupervisors] = useState(true);

    // ── Tìm kiếm SV trong ngày ──────────────────────
    const [studentSearch, setStudentSearch] = useState("");
    const [studentSearchResults, setStudentSearchResults] = useState<ExamSchedule[]>([]);
    const [searchingStudent, setSearchingStudent] = useState(false);

    // ── Trạng thái sắp xếp tên ───────────────────────
    const [nameSortDir, setNameSortDir] = useState<'asc' | 'desc'>('asc');

    // ── Camera Modal ────────────────────────────────
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const startStr = formatTime(schedule.start_time);
    const endDate = new Date(new Date(schedule.start_time).getTime() + (schedule.duration ?? 120) * 60000);
    const endStr = formatTime(endDate);

    // Fetch attendance records
    const fetchRecords = useCallback(async () => {
        setLoadingRecords(true);
        try {
            const res = await api.get("/attendance-records", {
                params: { exam_schedule_id: schedule.id, limit: 200 },
            });
            setRecords(res.data?.data ?? []);
        } catch {
            toast.error("Không thể tải danh sách thí sinh");
        } finally {
            setLoadingRecords(false);
        }
    }, [schedule.id]);

    // Fetch supervisors
    const fetchSupervisors = useCallback(async () => {
        setLoadingSupervisors(true);
        try {
            const res = await api.get("/exam-supervisors", {
                params: { exam_schedule_id: schedule.id, limit: 50 },
            });
            setSupervisors(res.data?.data ?? []);
        } catch {
            toast.error("Không thể tải danh sách giám thị");
        } finally {
            setLoadingSupervisors(false);
        }
    }, [schedule.id]);

    useEffect(() => {
        fetchRecords();
        fetchSupervisors();
    }, [fetchRecords, fetchSupervisors]);

    // Tìm kiếm sinh viên trong ngày
    useEffect(() => {
        if (!studentSearch.trim()) {
            setStudentSearchResults([]);
            return;
        }
        const t = setTimeout(async () => {
            setSearchingStudent(true);
            try {
                const today = todayString();
                const res = await api.get("/exam-schedules", {
                    params: {
                        start_time: today,
                        search: studentSearch,
                        limit: 50,
                    },
                });
                setStudentSearchResults(res.data?.data ?? []);
            } catch {
                console.error("Lỗi khi tìm kiếm sinh viên");
            } finally {
                setSearchingStudent(false);
            }
        }, 400);
        return () => clearTimeout(t);
    }, [studentSearch]);

    // Đếm đã điểm danh
    const attendedCount = records.filter((r) => r.attendance_time).length;

    // Sắp xếp: đã điểm danh lên đầu (mới nhất trước), chưa điểm danh xếp theo tên
    const sortedRecords = useMemo(() => {
        return [...records].sort((a, b) => {
            const aChecked = !!a.attendance_time;
            const bChecked = !!b.attendance_time;

            if (aChecked && bChecked) {
                return new Date(b.attendance_time!).getTime() - new Date(a.attendance_time!).getTime(); // desc
            }
            if (aChecked) return -1;
            if (bChecked) return 1;

            const nameA = a.student?.first_name || "";
            const nameB = b.student?.first_name || "";
            const order = nameSortDir === 'asc' ? 1 : -1;

            if (nameA !== nameB) return nameA.localeCompare(nameB) * order;

            const lastA = a.student?.last_name || "";
            const lastB = b.student?.last_name || "";
            return lastA.localeCompare(lastB) * order;
        });
    }, [records, nameSortDir]);

    // Phân trang
    const totalPages = Math.ceil(sortedRecords.length / 20);
    const { page, limit, setPage } = usePagination(totalPages, { initialLimit: 20 });
    const paginatedRecords = sortedRecords.slice((page - 1) * limit, page * limit);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                    aria-label="Quay lại"
                >
                    <i className="ti ti-arrow-left text-lg" />
                </button>
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Chi tiết ca thi</h2>
                    <p className="text-xs text-slate-500">Thông tin chi tiết và danh sách thí sinh</p>
                </div>
            </div>

            {/* Thông tin ca thi & Giám thị */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">
                            {schedule.subject?.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-white/70 text-blue-700 border border-blue-200/50">
                                {schedule.subject?.subject_code}
                            </span>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs font-medium text-slate-700">Nhóm {schedule.group}</span>
                        </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 self-start">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        Đang thi
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <InfoBadge icon="clock" label="Thời gian" value={`${startStr} – ${endStr}`} />
                    <InfoBadge icon="door" label="Phòng thi" value={schedule.room?.name || "—"} />
                    <InfoBadge icon="hourglass" label="Thời lượng" value={`${schedule.duration} phút`} />
                    <InfoBadge icon="users" label="Thí sinh" value={`${records.length}`} />
                </div>

                {schedule.exam_period && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-blue-700">
                        <i className="ti ti-calendar-event text-sm" />
                        <span className="font-medium">{schedule.exam_period.name}</span>
                    </div>
                )}
                
                {/* Giám thị tích hợp */}
                <div className="pt-4 border-t border-blue-200/50 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                        <i className="ti ti-user-check text-blue-600" />
                        <h4 className="text-sm font-semibold text-slate-900">Giám thị coi thi</h4>
                        <span className="text-xs text-slate-500 ml-auto">
                            {loadingSupervisors ? "Đang tải..." : `${supervisors.length} giám thị`}
                        </span>
                    </div>
                    {loadingSupervisors ? (
                        <div className="text-sm text-slate-500">Đang tải...</div>
                    ) : supervisors.length === 0 ? (
                        <div className="text-sm text-slate-500">Chưa có giám thị nào</div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {supervisors.map((s) => (
                                <div
                                    key={s.id}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 border border-blue-100/50"
                                >
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                        <i className="ti ti-user text-blue-600 text-xs" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium text-slate-800">
                                            {s.lecturer?.last_name} {s.lecturer?.first_name}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Nút bật camera */}
            <div className="flex justify-center py-2">
                <Button
                    variant="primary"
                    size="lg"
                    leftIcon="camera"
                    onClick={() => setIsCameraOpen(true)}
                    className="px-8 shadow-md hover:shadow-lg transition-all"
                >
                    Bật Camera Điểm Danh
                </Button>
            </div>

            {/* Tìm kiếm SV trong ngày */}
            <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                    <i className="ti ti-search text-violet-600" />
                    <h4 className="text-sm font-semibold text-slate-900">Tra cứu sinh viên trong ngày</h4>
                </div>
                <div className="p-4 space-y-3">
                    <SearchBar
                        value={studentSearch}
                        onChange={setStudentSearch}
                        placeholder="Nhập mã SV hoặc tên để xem thuộc ca thi nào..."
                        className="max-w-full"
                    />

                    {searchingStudent && (
                        <div className="text-sm text-slate-400 text-center py-2 flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                            Đang tìm kiếm...
                        </div>
                    )}

                    {!searchingStudent && studentSearch.trim() && studentSearchResults.length === 0 && (
                        <div className="text-sm text-slate-400 text-center py-2">
                            Không tìm thấy kết quả cho "{studentSearch}"
                        </div>
                    )}

                    {studentSearchResults.length > 0 && (
                        <div className="space-y-2">
                            {studentSearchResults.map((s) => {
                                const sStart = formatTime(s.start_time);
                                const sEnd = formatTime(new Date(new Date(s.start_time).getTime() + (s.duration ?? 120) * 60000));
                                return (
                                    <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100 text-sm">
                                        <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
                                            <i className="ti ti-book text-violet-600 text-sm" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-slate-900 truncate">{s.subject?.name}</div>
                                            <div className="text-xs text-slate-500">
                                                {s.subject?.subject_code} · Nhóm {s.group} · Phòng {s.room?.name} · {sStart} – {sEnd}
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                            {s.attendance_count ?? 0} SV
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Danh sách thí sinh */}
            <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                    <i className="ti ti-list-check text-emerald-600" />
                    <h4 className="text-sm font-semibold text-slate-900">Danh sách thí sinh</h4>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {attendedCount} đã điểm danh
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {records.length - attendedCount} chưa
                        </span>
                    </div>
                </div>

                <div className="border-b border-slate-100 max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50/80 sticky top-0 z-10">
                            <tr className="text-left text-slate-500 text-xs">
                                <th className="px-4 py-2.5 font-medium w-10">#</th>
                                <th className="px-4 py-2.5 font-medium">Mã SV</th>
                                <th 
                                    className="px-4 py-2.5 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => setNameSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                                >
                                    <div className="flex items-center gap-1">
                                        Họ tên
                                        <i className={`ti ti-sort-${nameSortDir === 'asc' ? 'ascending' : 'descending'} text-slate-400`} />
                                    </div>
                                </th>
                                <th className="px-4 py-2.5 font-medium">Lớp</th>
                                <th className="px-4 py-2.5 font-medium text-center">Trạng thái</th>
                                <th className="px-4 py-2.5 font-medium text-right">Thời gian</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingRecords ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                                        <span className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin inline-block mb-2" />
                                        <br />Đang tải danh sách...
                                    </td>
                                </tr>
                            ) : sortedRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                                        Chưa có thí sinh nào trong ca thi này
                                    </td>
                                </tr>
                            ) : (
                                paginatedRecords.map((r, idx) => (
                                    <tr key={r.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-2.5 text-slate-400 text-xs">{(page - 1) * limit + idx + 1}</td>
                                        <td className="px-4 py-2.5 font-medium text-slate-900">
                                            {r.student?.student_code}
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-700">
                                            {r.student?.last_name} {r.student?.first_name}
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-500 text-xs">
                                            {r.student?.class?.name || r.student?.class?.class_code || "—"}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            {r.attendance_time ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <i className="ti ti-check text-xs" />
                                                    Đã điểm danh
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                    <i className="ti ti-clock text-xs" />
                                                    Chờ điểm danh
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-xs text-slate-400">
                                            {r.attendance_time ? formatDateTime(r.attendance_time) : "—"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Phân trang */}
                <Pagination
                    page={page}
                    limit={limit}
                    total={sortedRecords.length}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />
            </div>

            {/* Check-in Camera Modal */}
            <CheckInCameraView
                open={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                schedule={schedule}
                onSuccess={fetchRecords}
            />
        </div>
    );
}

// ── Info Badge ─────────────────────────────────────────────
function InfoBadge({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2 border border-blue-100/50">
            <i className={`ti ti-${icon} text-blue-500 text-sm`} />
            <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{label}</div>
                <div className="text-sm font-semibold text-slate-800">{value}</div>
            </div>
        </div>
    );
}
