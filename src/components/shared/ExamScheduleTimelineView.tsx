"use client";

import { ExamSchedule } from "@/types";
import { formatTime, formatDateVN } from "@/lib/utils";
import { useMemo } from "react";

export type TimelineVariant = "lecturer" | "student";

interface Props {
    examSchedules: ExamSchedule[];
    loading?: boolean;
    variant: TimelineVariant;
}

const CARD_COLORS = [
    { bg: "#e8f0fe", border: "#1a73e8", subject: "#174ea6", code: "#1967d2", badgeSv: "#d2e3fc", badgeSvText: "#174ea6" },
    { bg: "#e6f4ea", border: "#1e8e3e", subject: "#137333", code: "#1e8e3e", badgeSv: "#ceead6", badgeSvText: "#137333" },
    { bg: "#fef7e0", border: "#e37400", subject: "#b06000", code: "#e37400", badgeSv: "#feefc3", badgeSvText: "#b06000" },
    { bg: "#eee8fb", border: "#7c4dff", subject: "#5e35b1", code: "#7c4dff", badgeSv: "#e1d8f6", badgeSvText: "#5e35b1" },
    { bg: "#fce8e6", border: "#d93025", subject: "#b31412", code: "#d93025", badgeSv: "#f8d7da", badgeSvText: "#b31412" },
];

function getColor(subjectCode: string) {
    let hash = 0;
    for (let i = 0; i < subjectCode.length; i++) hash = subjectCode.charCodeAt(i) + ((hash << 5) - hash);
    return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

// ─── Horizontal Card ──────────────────────────────────────────────────────────
function ExamListCard({ schedule, variant }: { schedule: ExamSchedule; variant: TimelineVariant }) {
    const color = getColor(schedule.subject?.subject_code ?? "");
    const startStr = formatTime(schedule.start_time);
    const endDate = new Date(new Date(schedule.start_time).getTime() + (schedule.duration ?? 120) * 60000);
    const endStr = formatTime(endDate);

    return (
        <div
            className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3.5 rounded-xl border border-slate-100 bg-white"
            style={{ borderLeft: `4px solid ${color.border}` }}
        >
            {/* Thời gian */}
            <div className="flex flex-row sm:flex-col sm:w-[120px] shrink-0 gap-1 sm:gap-0 border-b sm:border-b-0 sm:border-r border-slate-100 pb-2 sm:pb-0">
                <div className="text-sm font-bold text-slate-800">{startStr}</div>
                <div className="text-xs text-slate-400">đến {endStr}</div>
            </div>

            {/* Chi tiết */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-base font-semibold leading-tight text-slate-900">{schedule.subject?.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {schedule.subject?.subject_code}
                            </span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-600 font-medium">Nhóm {schedule.group}</span>
                        </div>
                    </div>
                    {/* Badge Phòng thi */}
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 text-blue-700">
                            <i className="ti ti-door text-sm" />
                            <span className="text-sm font-semibold">{schedule.room?.name}</span>
                        </div>
                    </div>
                </div>

                {/* Thông tin phụ */}
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <i className="ti ti-hourglass text-slate-400 text-sm" />
                        {schedule.duration} phút
                    </div>
                    {variant !== "student" && schedule.attendance_count !== undefined && (
                        <div className="flex items-center gap-1">
                            <i className="ti ti-users text-slate-400 text-sm" />
                            {schedule.attendance_count} thí sinh
                        </div>
                    )}
                    {schedule.note && (
                        <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                            <i className="ti ti-alert-circle text-xs" />
                            <span className="truncate max-w-[200px]">{schedule.note}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ExamScheduleTimelineView({ examSchedules, loading, variant }: Props) {
    // Gom nhóm ca thi theo ngày
    const groupedSchedules = useMemo(() => {
        const groups: Record<string, ExamSchedule[]> = {};
        examSchedules.forEach((s) => {
            const dateObj = new Date(s.start_time);
            // Format YYYY-MM-DD để làm key
            const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(s);
        });

        // Sắp xếp các ngày từ cũ đến mới
        const sortedDates = Object.keys(groups).sort((a, b) => a.localeCompare(b));
        
        return sortedDates.map(dateKey => {
            // Sắp xếp các ca trong ngày theo giờ
            const schedules = groups[dateKey].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
            return {
                dateKey,
                schedules,
                label: formatDateVN(dateKey) // Hàm formatDateVN tự xử lý format đẹp (ví dụ: Thứ Hai, 24/06/2026)
            };
        });
    }, [examSchedules]);

    if (loading) {
        return (
            <div className="py-16 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
                <span className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-blue-500 animate-spin inline-block" />
                Đang tải lịch thi...
            </div>
        );
    }

    if (examSchedules.length === 0) {
        return (
            <div className="py-20 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                    <i className="ti ti-calendar-smile text-4xl text-slate-300" />
                </div>
                <div className="font-medium text-slate-600">Bạn không có ca thi nào sắp tới.</div>
                <div>Có thể chọn học kỳ/đợt thi khác để kiểm tra.</div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 bg-slate-50/50">
            <div className="max-w-4xl mx-auto space-y-8 relative">
                {/* Đường timeline dọc (chỉ hiện trên màn hình lớn) */}
                <div className="hidden sm:block absolute left-[8px] top-4 bottom-4 w-px bg-slate-200" />

                {groupedSchedules.map((group, groupIdx) => (
                    <div key={group.dateKey} className="relative sm:pl-8">
                        {/* Dot timeline */}
                        <div className="hidden sm:flex absolute left-[4px] top-1.5 w-[9px] h-[9px] rounded-full bg-blue-500 ring-4 ring-slate-50/50" />

                        {/* Ngày header */}
                        <div className="sticky top-0 z-10 py-2 mb-3 bg-slate-50/90 backdrop-blur-sm -mx-4 px-4 sm:mx-0 sm:px-0">
                            <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                                <i className="ti ti-calendar-event text-blue-600" />
                                {group.label}
                            </h3>
                            <div className="text-xs text-slate-500 mt-0.5 ml-6">
                                {group.schedules.length} ca thi
                            </div>
                        </div>

                        {/* Danh sách thẻ */}
                        <div className="space-y-3">
                            {group.schedules.map(schedule => (
                                <ExamListCard
                                    key={schedule.id}
                                    schedule={schedule}
                                    variant={variant}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
