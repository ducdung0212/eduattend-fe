"use client";

import { ExamSchedule, Semester, PaginationMeta } from "@/types";
import { Pagination } from "@/components/shared/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { formatTime } from "@/lib/utils";
import { SearchBar } from "@/components/shared/SearchBar";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface Props {
    onSelectSchedule: (schedule: ExamSchedule) => void;
    lecturerCode?: string;
    variant?: "admin" | "lecturer";
}

const CARD_COLORS = [
    { bg: "#e8f0fe", border: "#1a73e8", subject: "#174ea6", code: "#1967d2", badge: "#d2e3fc", badgeText: "#174ea6" },
    { bg: "#e6f4ea", border: "#1e8e3e", subject: "#137333", code: "#1e8e3e", badge: "#ceead6", badgeText: "#137333" },
    { bg: "#fef7e0", border: "#e37400", subject: "#b06000", code: "#e37400", badge: "#feefc3", badgeText: "#b06000" },
    { bg: "#eee8fb", border: "#7c4dff", subject: "#5e35b1", code: "#7c4dff", badge: "#e1d8f6", badgeText: "#5e35b1" },
    { bg: "#fce8e6", border: "#d93025", subject: "#b31412", code: "#d93025", badge: "#f8d7da", badgeText: "#b31412" },
];

function getColor(subjectCode: string) {
    let hash = 0;
    for (let i = 0; i < subjectCode.length; i++) hash = subjectCode.charCodeAt(i) + ((hash << 5) - hash);
    return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}



export function OngoingExamCards({ onSelectSchedule, lecturerCode, variant = "admin" }: Props) {
    const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Học kì
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState("");

    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const { page, setPage, reset: resetPage } = usePagination(meta?.totalPages ?? 1);

    // Fetch học kì
    useEffect(() => {
        api.get("/semesters", { params: { limit: 100 } })
            .then((res) => setSemesters(res.data?.data || []))
            .catch(() => { });
    }, []);

    const fetchOngoing = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/exam-schedules/ongoing", {
                params: {
                    search: search || undefined,
                    semester_id: selectedSemesterId || undefined,
                    lecturer_code: lecturerCode || undefined,
                    page,
                    limit: 12,
                },
            });
            setSchedules(res.data?.data ?? []);
            setMeta(res.data?.meta ?? null);
        } catch (e) {
            console.error("Lỗi khi tải ca thi đang diễn ra:", e);
            toast.error("Không thể tải danh sách ca thi");
        } finally {
            setLoading(false);
        }
    }, [search, selectedSemesterId, page, lecturerCode]);

    // Reset trang về 1 khi search hoặc selectedSemesterId thay đổi
    useEffect(() => {
        resetPage();
    }, [search, selectedSemesterId, resetPage]);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(fetchOngoing, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchOngoing, search, page]);

    // Không dùng auto-refresh nữa, để người dùng tự bấm làm mới

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            {variant === "admin" && (
                <div className="flex items-center gap-3 flex-wrap">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Tìm theo tên môn, mã môn, phòng thi..."
                        className="flex-1 min-w-[240px] max-w-md"
                    />
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Học kì:</label>
                        <select
                            value={selectedSemesterId}
                            onChange={(e) => setSelectedSemesterId(e.target.value)}
                            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 max-w-[220px]"
                        >
                            <option value="">Tất cả</option>
                            {semesters.map((p) => (
                                <option key={p.id} value={p.id}>Học kì {p.semester_number} - {p.academic_year}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={fetchOngoing}
                        disabled={loading}
                        className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        title="Tải lại"
                    >
                        <i className={`ti ti-refresh text-lg ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="py-16 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
                    <span className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-blue-500 animate-spin inline-block" />
                    Đang tải ca thi đang diễn ra...
                </div>
            ) : schedules.length === 0 ? (
                <div className="py-20 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-1">
                        <i className="ti ti-clock-off text-4xl text-slate-300" />
                    </div>
                    <div className="font-medium text-slate-600">Không có ca thi nào đang diễn ra</div>
                    <div className="text-slate-400 text-xs">Bạn có thể nhấn nút tải lại để kiểm tra nếu có ca thi mới</div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {schedules.map((schedule) => (
                            <OngoingCard
                                key={schedule.id}
                                schedule={schedule}
                                onClick={() => onSelectSchedule(schedule)}
                            />
                        ))}
                    </div>

                    {meta && meta.totalPages > 1 && (
                        <div className="flex justify-center mt-6">
                            <Pagination
                                page={page}
                                totalPages={meta.totalPages}
                                total={meta.total}
                                limit={meta.limit}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Card component ────────────────────────────────────────────────────────
function OngoingCard({ schedule, onClick }: { schedule: ExamSchedule; onClick: () => void }) {
    const color = getColor(schedule.subject?.subject_code ?? "");
    const startStr = formatTime(schedule.start_time);
    const endDate = new Date(new Date(schedule.start_time).getTime() + (schedule.duration ?? 120) * 60000);
    const endStr = formatTime(endDate);
    const supervisors = schedule.supervisors ?? [];

    return (
        <div
            onClick={onClick}
            className="group relative flex flex-col gap-3 p-4 rounded-xl bg-white border border-slate-200/80 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300"
            style={{ borderLeft: `4px solid ${color.border}` }}
        >
            {/* Badge trạng thái */}
            <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Đang thi
                </span>
                <span className="text-[11px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded">
                    {schedule.duration} phút
                </span>
            </div>

            {/* Tên môn */}
            <div>
                <div className="text-sm font-bold leading-snug" style={{ color: color.subject }}>
                    {schedule.subject?.name}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs font-medium" style={{ color: color.code }}>
                    <span
                        className="inline-block w-[5px] h-[5px] rounded-full shrink-0"
                        style={{ background: color.border }}
                    />
                    {schedule.subject?.subject_code} · Nhóm {schedule.group}
                </div>
            </div>

            {/* Thời gian + Phòng */}
            <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                    <i className="ti ti-clock text-slate-400" />
                    {startStr} – {endStr}
                </div>
                <div className="flex items-center gap-1">
                    <i className="ti ti-door text-slate-400" />
                    {schedule.room?.name}
                </div>
            </div>

            {/* Giám thị */}
            {supervisors.length > 0 && (
                <div className="flex flex-col gap-0.5">
                    {supervisors.slice(0, 2).map((name, i) => (
                        <div key={i} className="flex items-center gap-1 text-[11px] text-slate-500 truncate" title={name}>
                            <i className="ti ti-user text-[10px] text-slate-400 shrink-0" />
                            {name}
                        </div>
                    ))}
                    {supervisors.length > 2 && (
                        <span className="text-[10px] text-slate-400">+{supervisors.length - 2} giám thị khác</span>
                    )}
                </div>
            )}

            {/* Footer: SV count */}
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
                <span
                    className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-md px-2 py-0.5"
                    style={{ background: color.badge, color: color.badgeText }}
                >
                    <i className="ti ti-users text-[11px] shrink-0" />
                    {schedule.attendance_count ?? 0} thí sinh
                </span>
                <span className="text-[11px] text-slate-400 group-hover:text-blue-500 transition-colors flex items-center gap-0.5">
                    Xem chi tiết
                    <i className="ti ti-chevron-right text-[10px]" />
                </span>
            </div>
        </div>
    );
}
