"use client";

import { ExamSchedule } from "@/types";
import { cn, formatTime } from "@/lib/utils";
import { Pagination } from "@/components/shared/Pagination";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";

interface Props {
    examSchedules: ExamSchedule[];
    loading?: boolean;
    onEdit?: (schedule: ExamSchedule) => void;
    onDelete?: (schedule: ExamSchedule) => void;
    onManageStudents?: (schedule: ExamSchedule) => void;
    onManageSupervisors?: (schedule: ExamSchedule) => void;
    onViewDetails?: (schedule: ExamSchedule) => void;
    selectable?: boolean;
    selectedKeys?: string[];
    onSelectChange?: (keys: string[]) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ROOMS_PER_PAGE = 5;

const PASTEL_COLORS = [
    { bg: "bg-blue-50", borderL: "border-l-blue-500", text: "text-blue-900", dot: "bg-blue-500", badgeBg: "bg-blue-100", badgeText: "text-blue-700" },
    { bg: "bg-teal-50", borderL: "border-l-teal-500", text: "text-teal-900", dot: "bg-teal-500", badgeBg: "bg-teal-100", badgeText: "text-teal-700" },
    { bg: "bg-purple-50", borderL: "border-l-purple-500", text: "text-purple-900", dot: "bg-purple-500", badgeBg: "bg-purple-100", badgeText: "text-purple-700" },
    { bg: "bg-pink-50", borderL: "border-l-pink-500", text: "text-pink-900", dot: "bg-pink-500", badgeBg: "bg-pink-100", badgeText: "text-pink-700" },
    { bg: "bg-indigo-50", borderL: "border-l-indigo-500", text: "text-indigo-900", dot: "bg-indigo-500", badgeBg: "bg-indigo-100", badgeText: "text-indigo-700" },
    { bg: "bg-emerald-50", borderL: "border-l-emerald-500", text: "text-emerald-900", dot: "bg-emerald-500", badgeBg: "bg-emerald-100", badgeText: "text-emerald-700" },
    { bg: "bg-rose-50", borderL: "border-l-rose-500", text: "text-rose-900", dot: "bg-rose-500", badgeBg: "bg-rose-100", badgeText: "text-rose-700" },
    { bg: "bg-cyan-50", borderL: "border-l-cyan-500", text: "text-cyan-900", dot: "bg-cyan-500", badgeBg: "bg-cyan-100", badgeText: "text-cyan-700" },
];

function getSubjectColor(subjectCode: string) {
    if (!subjectCode) return PASTEL_COLORS[0];
    let hash = 0;
    for (let i = 0; i < subjectCode.length; i++) hash = subjectCode.charCodeAt(i) + ((hash << 5) - hash);
    return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length];
}

const START_HOUR = 7;
const END_HOUR = 18;
const PIXELS_PER_HOUR = 100;
const TOTAL_HOURS = END_HOUR - START_HOUR;

// Ngưỡng chiều cao (px) dưới mức này coi là "card ngắn", cần phồng ra khi hover
const COMPACT_HEIGHT_THRESHOLD = 150;
// Chiều cao tối thiểu khi phồng ra để đủ chỗ hiển thị toàn bộ nội dung
const EXPANDED_MIN_HEIGHT = 132;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatHourLabel(h: number) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12} ${ampm}`;
}



// ─── Context Menu ──────────────────────────────────────────────────────────────
function ContextMenu({
    schedule,
    anchorPos,
    onClose,
    onEdit,
    onDelete,
    onManageStudents,
    onManageSupervisors,
    onViewDetails,
}: {
    schedule: ExamSchedule;
    anchorPos: { x: number; y: number };
    onClose: () => void;
    onEdit?: (s: ExamSchedule) => void;
    onDelete?: (s: ExamSchedule) => void;
    onManageStudents?: (s: ExamSchedule) => void;
    onManageSupervisors?: (s: ExamSchedule) => void;
    onViewDetails?: (s: ExamSchedule) => void;
}) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState(anchorPos);

    useEffect(() => {
        const el = menuRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        let { x, y } = anchorPos;
        if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
        if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
        if (x < 8) x = 8;
        if (y < 8) y = 8;
        setPos({ x, y });
    }, [anchorPos]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
        };
        const escHandler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("mousedown", handler);
        document.addEventListener("keydown", escHandler);
        return () => {
            document.removeEventListener("mousedown", handler);
            document.removeEventListener("keydown", escHandler);
        };
    }, [onClose]);

    const menuItems = [
        {
            label: "Xem chi tiết",
            icon: <i className="ti ti-file-description text-sm" />,
            onClick: () => { onViewDetails?.(schedule); onClose(); },
            className: "text-slate-700 hover:bg-slate-50",
        },
        {
            label: "Sửa ca thi",
            icon: <i className="ti ti-edit text-sm" />,
            onClick: () => { onEdit?.(schedule); onClose(); },
            className: "text-slate-700 hover:bg-slate-50",
        },
        {
            label: "Danh sách thí sinh",
            icon: <i className="ti ti-users text-sm" />,
            onClick: () => { onManageStudents?.(schedule); onClose(); },
            className: "text-slate-700 hover:bg-slate-50",
        },
        {
            label: "Phân công giám thị",
            icon: <i className="ti ti-user-check text-sm" />,
            onClick: () => { onManageSupervisors?.(schedule); onClose(); },
            className: "text-slate-700 hover:bg-slate-50",
        },
        {
            label: "Xóa ca thi",
            icon: <i className="ti ti-trash text-sm" />,
            onClick: () => { onDelete?.(schedule); onClose(); },
            className: "text-red-600 hover:bg-red-50",
        },
    ];

    return (
        <div
            ref={menuRef}
            className="fixed z-[9999] bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[190px] animate-in fade-in zoom-in-95 duration-150"
            style={{ top: pos.y, left: pos.x }}
        >
            <div className="px-3.5 pt-2 pb-1.5 border-b border-slate-100 mb-1">
                <div className="text-xs font-semibold text-slate-900 leading-snug">
                    {schedule.subject?.name}
                </div>
                <div className="text-[10.5px] text-slate-400 mt-0.5">
                    {schedule.subject?.subject_code} · Nhóm {schedule.group}
                </div>
            </div>
            {menuItems.map((item, i) => (
                <button
                    key={i}
                    onClick={item.onClick}
                    className={cn(
                        "flex items-center gap-2.5 w-full px-3.5 py-2 text-[13px] text-left transition-colors cursor-pointer",
                        item.className,
                    )}
                >
                    {item.icon}
                    {item.label}
                </button>
            ))}
        </div>
    );
}

// ─── ExamCard ──────────────────────────────────────────────────────────────
function ExamCard({
    schedule,
    onClick,
    selectable,
    selected,
    onSelect,
    style,
    className
}: {
    schedule: ExamSchedule;
    onClick: (e: React.MouseEvent) => void;
    selectable?: boolean;
    selected?: boolean;
    onSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    style?: React.CSSProperties;
    className?: string;
}) {
    const [isHovered, setIsHovered] = useState(false);

    const color = getSubjectColor(schedule.subject?.subject_code ?? "");
    const supervisors = schedule.supervisors ?? [];
    const startStr = formatTime(schedule.start_time);
    const duration = schedule.duration ?? 120;
    const endDate = new Date(new Date(schedule.start_time).getTime() + duration * 60000);
    const endStr = formatTime(endDate);

    const isOverCapacity = (schedule.attendance_count ?? 0) > (schedule.room?.capacity ?? 99999);

    // Card có chiều cao gốc nhỏ hơn ngưỡng -> không đủ chỗ hiển thị hết thông tin
    const rawHeight = typeof style?.height === "number" ? style.height : 0;
    const isCompact = rawHeight > 0 && rawHeight < COMPACT_HEIGHT_THRESHOLD;
    const isExpanded = isHovered && isCompact;

    // Khi phồng ra: bỏ giới hạn height gốc, đặt minHeight đủ để hiện toàn bộ nội dung,
    // và nâng z-index để đè lên các card lân cận trong cùng room-column.
    const finalStyle: React.CSSProperties = {
        ...style,
        height: isExpanded ? "auto" : style?.height,
        minHeight: isExpanded ? EXPANDED_MIN_HEIGHT : style?.height,
        zIndex: isExpanded ? 50 : undefined,
    };

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "flex flex-col gap-0.5 rounded-[6px] py-1.5 pr-2 relative transition-all duration-150 cursor-pointer group overflow-hidden border border-slate-100",
                selectable ? "pl-7" : "pl-2",
                isExpanded ? "shadow-lg ring-1 ring-black/5" : "shadow-sm hover:shadow-md",
                color.bg,
                className
            )}
            style={finalStyle}
        >
            {selectable && (
                <div className="absolute top-1.5 left-1.5 z-[15]" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={onSelect}
                        className={cn("rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-opacity", !selected && "opacity-0 group-hover:opacity-100")}
                    />
                </div>
            )}
            {/* Duration ở góc trên cùng bên phải */}
            <span className="absolute top-1.5 right-1.5 z-[10] pointer-events-none text-[10px] font-medium bg-black/5 rounded px-1.5 py-0.5 text-slate-500 hidden sm:inline-block">
                {duration}p
            </span>

            {/* Tên môn (Hàng đầu, in đậm) */}
            <div className={cn("text-[13px] font-bold leading-snug pr-8", color.text)}>
                {schedule.subject?.name}
            </div>

            {/* Thời gian và Mã môn + nhóm dàn ngang */}
            <div className={cn("flex items-center flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] font-medium opacity-80 mt-0.5", color.text)}>
                <div className="flex items-center gap-1 tabular-nums">
                    <i className="ti ti-clock text-[11px] shrink-0" />
                    {startStr} - {endStr}
                </div>
                <div className="flex items-center gap-1">
                    <span className={cn("inline-block w-[3px] h-[3px] rounded-full shrink-0", color.dot)} />
                    {schedule.subject?.subject_code} · N{schedule.group}
                </div>
            </div>

            {/* Giám thị: hiện khi đủ chỗ (duration >= 90) HOẶC đang hover mở rộng */}
            {supervisors.length > 0 && (duration >= 90 || isExpanded) && (
                <div className="flex flex-col gap-px mt-1.5">
                    {supervisors.map((name, i) => (
                        <div
                            key={i}
                            className={cn("flex items-center gap-1 text-[11px] opacity-75 truncate max-w-full", color.text)}
                            title={name}
                        >
                            <i className="ti ti-user text-[11px] shrink-0" />
                            {name}
                        </div>
                    ))}
                </div>
            )}

            {/* Badge SV */}
            <div className="flex gap-1.5 mt-auto flex-wrap items-center pt-1.5">
                <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold rounded-md px-1.5 py-0.5 tracking-wide", color.badgeBg, color.badgeText)}>
                    <i className="ti ti-users text-[11px] shrink-0" />
                    {schedule.attendance_count ?? 0} thí sinh
                </span>
                {isOverCapacity && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600">
                        <i className="ti ti-alert-triangle text-[11px]" />
                        Vượt quá sức chứa
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ExamScheduleGridView({
    examSchedules,
    loading,
    onEdit,
    onDelete,
    onManageStudents,
    onManageSupervisors,
    onViewDetails,
    selectable,
    selectedKeys = [],
    onSelectChange,
}: Props) {
    const [contextMenu, setContextMenu] = useState<{
        schedule: ExamSchedule;
        pos: { x: number; y: number };
    } | null>(null);

    const [roomPage, setRoomPage] = useState(0);

    const { allRooms, schedulesByRoom } = useMemo(() => {
        const roomMap = new Map<string, { room_code: string; name: string; capacity?: number }>();
        examSchedules.forEach((s) => {
            if (s.room) roomMap.set(s.room.room_code, s.room);
        });
        const allRooms = Array.from(roomMap.values()).sort((a, b) => a.room_code.localeCompare(b.room_code));

        const schedulesByRoom: Record<string, ExamSchedule[]> = {};
        examSchedules.forEach((s) => {
            if (s.room) {
                if (!schedulesByRoom[s.room.room_code]) schedulesByRoom[s.room.room_code] = [];
                schedulesByRoom[s.room.room_code].push(s);
            }
        });

        return { allRooms, schedulesByRoom };
    }, [examSchedules]);

    useEffect(() => {
        setRoomPage(0);
    }, [examSchedules]);

    const totalRoomPages = Math.ceil(allRooms.length / ROOMS_PER_PAGE);
    const needsPagination = allRooms.length > ROOMS_PER_PAGE;
    const rooms = needsPagination
        ? allRooms.slice(roomPage * ROOMS_PER_PAGE, (roomPage + 1) * ROOMS_PER_PAGE)
        : allRooms;

    const handleCardClick = useCallback((schedule: ExamSchedule, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ schedule, pos: { x: e.clientX, y: e.clientY } });
    }, []);

    const closeContextMenu = useCallback(() => setContextMenu(null), []);

    if (loading) {
        return (
            <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
                <span className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-blue-500 animate-spin inline-block" />
                Đang tải lịch thi...
            </div>
        );
    }

    if (examSchedules.length === 0) {
        return (
            <div className="py-14 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                <i className="ti ti-calendar-off text-4xl text-slate-300" />
                Không có ca thi nào trong ngày này.
            </div>
        );
    }

    return (
        <>
            <div className="overflow-x-auto bg-white border border-slate-300 rounded-lg shadow-sm">
                <div className="min-w-full w-max flex flex-col">
                    {/* Header */}
                    <div className="flex border-b border-slate-300 sticky top-0 z-[30] bg-white">
                        <div className="text-center w-[80px] shrink-0 sticky left-0 z-[40] bg-slate-50 border-r border-slate-300 p-3 flex flex-col justify-end items-end text-[11px] font-semibold text-slate-500">
                            GIỜ/PHÒNG
                        </div>
                        {rooms.map((room) => (
                            <div
                                key={room.room_code}
                                className="flex-1 min-w-[220px] border-r border-slate-300 px-3.5 py-3 bg-slate-50 flex flex-col items-center justify-center"
                            >
                                <div className="text-[13px] font-bold text-black tracking-tight">
                                    {room.name ?? room.room_code}
                                </div>
                                {room.capacity && (
                                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                                        <i className="ti ti-armchair text-[10px]" />
                                        {room.capacity} chỗ
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Body */}
                    <div className="flex relative" style={{ height: TOTAL_HOURS * PIXELS_PER_HOUR }}>
                        {/* Time Axis */}
                        <div className="w-[80px] shrink-0 sticky left-0 z-[20] bg-white border-r border-slate-300">
                            {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => {
                                const isLast = i === TOTAL_HOURS;
                                return (
                                    <div key={i} className={cn("relative", !isLast && "border-b border-slate-200")} style={{ height: isLast ? 0 : PIXELS_PER_HOUR }}>
                                        <span
                                            className="absolute w-full text-center text-[11px] font-medium text-slate-500"
                                            style={{ top: i === 0 ? '4px' : (isLast ? '-18px' : '-8px') }}
                                        >
                                            {formatHourLabel(START_HOUR + i)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Background Grid */}
                        <div className="absolute inset-0 pointer-events-none left-[80px] flex flex-col z-[1]">
                            {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                                <div key={i} className="border-b border-slate-200 w-full" style={{ height: PIXELS_PER_HOUR }} />
                            ))}
                        </div>



                        {/* Room Columns */}
                        {rooms.map((room) => (
                            <div key={room.room_code} className="flex-1 min-w-[220px] relative border-r border-slate-200 z-[10]">
                                {(schedulesByRoom[room.room_code] || []).map((schedule) => {
                                    const d = new Date(schedule.start_time);
                                    const h = d.getHours();
                                    const m = d.getMinutes();
                                    const duration = schedule.duration || 120;

                                    let top = (h - START_HOUR) * PIXELS_PER_HOUR + (m / 60) * PIXELS_PER_HOUR;
                                    let height = (duration / 60) * PIXELS_PER_HOUR;

                                    if (top < 0) {
                                        height += top;
                                        top = 0;
                                    }
                                    if (top + height > TOTAL_HOURS * PIXELS_PER_HOUR) {
                                        height = TOTAL_HOURS * PIXELS_PER_HOUR - top;
                                    }

                                    if (top >= TOTAL_HOURS * PIXELS_PER_HOUR || height <= 0) return null;

                                    return (
                                        <ExamCard
                                            key={schedule.id}
                                            schedule={schedule}
                                            onClick={(e) => handleCardClick(schedule, e)}
                                            selectable={selectable}
                                            selected={selectedKeys.includes(schedule.id)}
                                            onSelect={(e) => {
                                                if (!onSelectChange) return;
                                                if (e.target.checked) {
                                                    onSelectChange([...selectedKeys, schedule.id]);
                                                } else {
                                                    onSelectChange(selectedKeys.filter(k => k !== schedule.id));
                                                }
                                            }}
                                            className="absolute left-1 right-1"
                                            style={{ top, height }}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {needsPagination && (
                <Pagination
                    page={roomPage + 1}
                    totalPages={totalRoomPages}
                    total={allRooms.length}
                    limit={ROOMS_PER_PAGE}
                    onPageChange={(p) => setRoomPage(p - 1)}
                />
            )}

            {/* Context menu */}
            {contextMenu && (
                <ContextMenu
                    schedule={contextMenu.schedule}
                    anchorPos={contextMenu.pos}
                    onClose={closeContextMenu}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onManageStudents={onManageStudents}
                    onManageSupervisors={onManageSupervisors}
                    onViewDetails={onViewDetails}
                />
            )}
        </>
    );
}