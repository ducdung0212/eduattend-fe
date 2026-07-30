"use client";

import { useEffect, useRef, useState } from "react";

interface DatePickerWithHighlightProps {
    value: string; // "YYYY-MM-DD"
    onChange: (date: string) => void;
    /** Các ngày có ca thi, dạng "YYYY-MM-DD" */
    highlightedDates?: string[];
    /** Giới hạn ngày min (YYYY-MM-DD) */
    minDate?: string;
    /** Giới hạn ngày max (YYYY-MM-DD) */
    maxDate?: string;
    className?: string;
}

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
    "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
    "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

function parseYMD(str: string): Date {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function toYMD(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export function DatePickerWithHighlight({
    value,
    onChange,
    highlightedDates = [],
    minDate,
    maxDate,
    className = "",
}: DatePickerWithHighlightProps) {
    const [open, setOpen] = useState(false);
    const [viewYear, setViewYear] = useState<number>(() => {
        const d = value ? parseYMD(value) : new Date();
        return d.getFullYear();
    });
    const [viewMonth, setViewMonth] = useState<number>(() => {
        const d = value ? parseYMD(value) : new Date();
        return d.getMonth(); // 0-indexed
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const highlightSet = new Set(highlightedDates);

    // Khi value thay đổi từ bên ngoài (prev/next arrow), cập nhật view
    useEffect(() => {
        if (value) {
            const d = parseYMD(value);
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
        }
    }, [value]);

    // Khi mở calendar và có minDate, khởi tạo view theo minDate nếu cần
    useEffect(() => {
        if (open && minDate) {
            const min = parseYMD(minDate);
            const cur = value ? parseYMD(value) : new Date();
            // Nếu giá trị hiện tại nằm ngoài khoảng, nhảy đến minDate
            if (minDate && maxDate) {
                const max = parseYMD(maxDate);
                if (cur < min || cur > max) {
                    setViewYear(min.getFullYear());
                    setViewMonth(min.getMonth());
                    return;
                }
            }
            setViewYear(cur.getFullYear());
            setViewMonth(cur.getMonth());
        }
    }, [open]); // eslint-disable-line

    // Click outside to close
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    // Tính các ngày trong tháng
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startDow = firstDayOfMonth.getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const minD = minDate ? parseYMD(minDate) : null;
    const maxD = maxDate ? parseYMD(maxDate) : null;

    const handleDayClick = (day: number) => {
        const d = new Date(viewYear, viewMonth, day);
        if (minD && d < minD) return;
        if (maxD && d > maxD) return;
        onChange(toYMD(d));
        setOpen(false);
    };

    const goToPrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear((y) => y - 1);
        } else {
            setViewMonth((m) => m - 1);
        }
    };

    const goToNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear((y) => y + 1);
        } else {
            setViewMonth((m) => m + 1);
        }
    };

    // Kiểm tra xem có thể đi prev/next không (dựa vào min/maxDate)
    const canGoPrev = () => {
        if (!minD) return true;
        // Tháng hiện tại phải > tháng của minDate
        return viewYear > minD.getFullYear() || (viewYear === minD.getFullYear() && viewMonth > minD.getMonth());
    };

    const canGoNext = () => {
        if (!maxD) return true;
        return viewYear < maxD.getFullYear() || (viewYear === maxD.getFullYear() && viewMonth < maxD.getMonth());
    };

    // Format giá trị hiển thị
    const displayValue = value
        ? (() => {
              const d = parseYMD(value);
              return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
          })()
        : "Chọn ngày";

    // Cells: mảng các ô (null = ô trống)
    const cells: (number | null)[] = [
        ...Array(startDow).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    // Đảm bảo số hàng đủ (điền thêm null cuối)
    while (cells.length % 7 !== 0) cells.push(null);

    return (
        <div ref={containerRef} className={`relative inline-block ${className}`}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="h-8 flex items-center gap-1.5 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors min-w-[130px]"
            >
                <i className="ti ti-calendar text-slate-400 text-base" />
                <span>{displayValue}</span>
            </button>

            {/* Calendar popup */}
            {open && (
                <div
                    className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-[260px]"
                    style={{ top: "100%", left: 0 }}
                >
                    {/* Header: điều hướng tháng */}
                    <div className="flex items-center justify-between mb-2">
                        <button
                            type="button"
                            onClick={goToPrevMonth}
                            disabled={!canGoPrev()}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Tháng trước"
                        >
                            <i className="ti ti-chevron-left text-sm" />
                        </button>
                        <span className="text-sm font-semibold text-slate-800 select-none">
                            {MONTHS[viewMonth]} {viewYear}
                        </span>
                        <button
                            type="button"
                            onClick={goToNextMonth}
                            disabled={!canGoNext()}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Tháng sau"
                        >
                            <i className="ti ti-chevron-right text-sm" />
                        </button>
                    </div>

                    {/* Ngày trong tuần */}
                    <div className="grid grid-cols-7 mb-1">
                        {DAYS.map((d) => (
                            <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Các ô ngày */}
                    <div className="grid grid-cols-7 gap-y-0.5">
                        {cells.map((day, idx) => {
                            if (day === null) {
                                return <div key={`empty-${idx}`} />;
                            }

                            const cellDate = new Date(viewYear, viewMonth, day);
                            const cellYMD = toYMD(cellDate);
                            const isSelected = value === cellYMD;
                            const isHighlighted = highlightSet.has(cellYMD);
                            const isDisabled = (minD && cellDate < minD) || (maxD && cellDate > maxD);
                            const isToday = cellYMD === toYMD(new Date());

                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => !isDisabled && handleDayClick(day)}
                                    disabled={!!isDisabled}
                                    title={isHighlighted ? "Có ca thi" : undefined}
                                    className={[
                                        "relative w-7 h-7 mx-auto flex items-center justify-center rounded-md text-[13px] font-medium transition-all",
                                        isDisabled
                                            ? "opacity-25 cursor-not-allowed text-slate-400"
                                            : isSelected
                                            ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                                            : isHighlighted
                                            ? "bg-blue-100 text-blue-800 hover:bg-blue-200 ring-1 ring-blue-300"
                                            : "text-slate-700 hover:bg-slate-200",
                                        isToday && !isSelected ? "ring-1 ring-inset ring-blue-400 font-semibold" : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    {highlightedDates.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span className="inline-block w-3 h-3 rounded bg-blue-100 ring-1 ring-blue-300 flex-shrink-0" />
                            <span>Ngày có ca thi</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
