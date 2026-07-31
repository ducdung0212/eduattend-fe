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

const CARD_COLORS = [
    { bg: "#e8f0fe", border: "#1a73e8", subject: "#174ea6", code: "#1967d2", badgeSv: "#d2e3fc", badgeSvText: "#174ea6" },
    { bg: "#e6f4ea", border: "#1e8e3e", subject: "#137333", code: "#1e8e3e", badgeSv: "#ceead6", badgeSvText: "#137333" },
    { bg: "#fef7e0", border: "#e37400", subject: "#b06000", code: "#e37400", badgeSv: "#feefc3", badgeSvText: "#b06000" },
    { bg: "#eee8fb", border: "#7c4dff", subject: "#5e35b1", code: "#7c4dff", badgeSv: "#e1d8f6", badgeSvText: "#5e35b1" },
    { bg: "#fce8e6", border: "#d93025", subject: "#b31412", code: "#d93025", badgeSv: "#f8d7da", badgeSvText: "#b31412" },
];

const SLOT_INDICATORS = [
    { accent: "#1a73e8" },
    { accent: "#1e8e3e" },
    { accent: "#e37400" },
    { accent: "#7c4dff" },
];

const SLOT_LABELS = ["Ca 1", "Ca 2", "Ca 3", "Ca 4"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getColor(subjectCode: string) {
    let hash = 0;
    for (let i = 0; i < subjectCode.length; i++) hash = subjectCode.charCodeAt(i) + ((hash << 5) - hash);
    return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

function getSlotIndex(startTime: string): number {
    const h = new Date(startTime).getHours();
    if (h < 9.5) return 0;
    if (h < 12.5) return 1;
    if (h < 15.5) return 2;
    return 3;
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
    onSelect
}: {
    schedule: ExamSchedule;
    onClick: (e: React.MouseEvent) => void;
    selectable?: boolean;
    selected?: boolean;
    onSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    const color = getColor(schedule.subject?.subject_code ?? "");
    const supervisors = schedule.supervisors ?? [];
    const startStr = formatTime(schedule.start_time);
    const endDate = new Date(new Date(schedule.start_time).getTime() + (schedule.duration ?? 120) * 60000);
    const endStr = formatTime(endDate);

    return (
        <div
            onClick={onClick}
            className="flex flex-col gap-1 h-full rounded-[10px] px-3 py-2.5 relative transition-all duration-150 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 group"
            style={{ background: color.bg }}
        >
            {selectable && (
                <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={onSelect}
                        className={cn("rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-opacity", !selected && "opacity-0 group-hover:opacity-100")}
                    />
                </div>
            )}
            {/* Thời gian */}
            <div className="flex items-center gap-1 text-[11.5px] font-medium text-slate-500 tabular-nums pr-5">
                <i className="ti ti-clock text-[11px] text-slate-400 shrink-0" />
                {startStr} - {endStr}
                <span className="ml-auto text-[10px] bg-black/5 rounded px-1 py-px text-slate-400 hidden sm:inline-block">
                    {schedule.duration}p
                </span>
            </div>

            {/* Tên môn */}
            <div className="text-xs font-semibold leading-snug pr-4" style={{ color: color.subject }}>
                {schedule.subject?.name}
            </div>

            {/* Mã môn + nhóm */}
            <div className="flex items-center gap-1 text-[10.5px] font-medium" style={{ color: color.code }}>
                <span
                    className="inline-block w-[5px] h-[5px] rounded-full shrink-0"
                    style={{ background: color.border }}
                />
                {schedule.subject?.subject_code} · Nhóm {schedule.group}
            </div>

            {/* Giám thị */}
            {supervisors.length > 0 && (
                <div className="flex flex-col gap-px mt-0.5">
                    {supervisors.map((name, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-1 text-[11.5px] text-slate-500 truncate max-w-full"
                            title={name}
                        >
                            <i className="ti ti-user text-[10px] text-slate-400 shrink-0" />
                            {name}
                        </div>
                    ))}
                </div>
            )}

            {/* Badge SV */}
            <div className="flex gap-1.5 mt-auto flex-wrap items-center">
                <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-md px-1.5 py-0.5 tracking-wide"
                    style={{ background: color.badgeSv, color: color.badgeSvText }}
                >
                    <i className="ti ti-users text-[10px] shrink-0" />
                    {schedule.attendance_count ?? 0} SV
                </span>
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

    const { allRooms, grid } = useMemo(() => {
        const roomMap = new Map<string, { room_code: string; name: string; capacity?: number }>();
        examSchedules.forEach((s) => {
            if (s.room) roomMap.set(s.room.room_code, s.room);
        });
        const allRooms = Array.from(roomMap.values()).sort((a, b) => a.room_code.localeCompare(b.room_code));

        const grid: Record<number, Record<string, ExamSchedule>> = { 0: {}, 1: {}, 2: {}, 3: {} };
        examSchedules.forEach((s) => {
            if (s.room) {
                const idx = getSlotIndex(s.start_time);
                grid[idx][s.room.room_code] = s;
            }
        });

        return { allRooms, grid };
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

    const activeSlots = SLOT_LABELS.map((label, idx) => ({
        idx,
        label,
        hasAny: allRooms.some((r) => grid[idx]?.[r.room_code]),
    })).filter((s) => s.hasAny);

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: rooms.length * 180 + 120 }}>
                    <thead>
                        <tr>
                            <th className="bg-slate-50 px-4 py-3.5 text-[13px] font-bold text-black border-b-2 border-r border-slate-200 w-[120px] text-left align-middle whitespace-nowrap sticky left-0 z-[2] tracking-wide">
                                <div className="flex items-center gap-1.5">
                                    <i className="ti ti-calendar text-sm" />
                                    Ca thi / Phòng
                                </div>
                            </th>
                            {rooms.map((room) => (
                                <th
                                    key={room.room_code}
                                    className="bg-slate-50 px-3.5 py-3 text-center border-b-2 border-r border-slate-200 min-w-[180px]"
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
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {activeSlots.map(({ idx, label }, rowIndex) => {
                            const indicator = SLOT_INDICATORS[idx] ?? SLOT_INDICATORS[0];
                            const isLast = rowIndex === activeSlots.length - 1;
                            return (
                                <tr key={idx}>
                                    <td
                                        className={cn(
                                            "bg-white px-3.5 py-3 align-middle whitespace-nowrap sticky left-0 z-[1] border-r border-slate-200",
                                            !isLast && "border-b border-slate-200",
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-1 h-6 rounded-sm shrink-0"
                                                style={{ background: indicator.accent }}
                                            />
                                            <span className="text-[13px] font-bold text-black">{label}</span>
                                        </div>
                                    </td>

                                    {rooms.map((room) => {
                                        const schedule = grid[idx]?.[room.room_code];
                                        return (
                                            <td
                                                key={room.room_code}
                                                className={cn(
                                                    "p-1.5 h-[130px] min-w-[180px] align-top border-r border-slate-200",
                                                    !isLast && "border-b border-slate-200",
                                                    schedule ? "bg-white" : "bg-slate-50/60",
                                                )}
                                            >
                                                {schedule ? (
                                                    <ExamCard
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
                                                    />
                                                ) : (
                                                    <div className="h-full flex items-center justify-center">
                                                        <div className="w-5 h-0.5 rounded-full bg-slate-200" />
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
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