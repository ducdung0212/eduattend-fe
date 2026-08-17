'use client';

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { fromVNDatetimeLocalToUTC, toVNDatetimeLocal, toYMD } from "@/lib/utils";
import { Semester, ExamSchedule, Room, Subject } from "@/types";
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import toast from "react-hot-toast";
import dayjs from "dayjs";

interface ExamScheduleFormModalProps {
    open: boolean;
    examSchedule: ExamSchedule | null;
    onClose: () => void;
    onSuccess: () => void;
}

// Các mốc thời lượng thường dùng — click để điền nhanh thay vì gõ tay
const DURATION_PRESETS = [45, 60, 90, 120, 180];

// Tên thứ tiếng Việt viết tắt
const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Sinh mảng các ngày giữa start và end (inclusive) */
function generateDateRange(startStr: string, endStr: string): string[] {
    const dates: string[] = [];
    let current = dayjs(startStr);
    const end = dayjs(endStr);
    while (current.isBefore(end) || current.isSame(end, 'day')) {
        dates.push(current.format("YYYY-MM-DD"));
        current = current.add(1, 'day');
    }
    return dates;
}

/** Format ngày ngắn: "T2 25/06" */
function formatDateChip(dateStr: string): { dayName: string; date: string } {
    const d = dayjs(dateStr);
    return {
        dayName: DAY_NAMES[d.day()],
        date: d.format("DD/MM"),
    };
}



export function ExamScheduleFormModal({ open, examSchedule, onClose, onSuccess }: ExamScheduleFormModalProps) {
    const [formData, setFormData] = useState({
        subject_code: "",
        group: 0,
        start_time: "", // Giữ định dạng datetime-local (YYYY-MM-DDTHH:mm), ghép từ examDate + examTime
        duration: 0,
        room_code: "",
        note: "",
        semester_id: "",
    });

    // Tách ngày/giờ để UI dễ nhập hơn datetime-local gộp
    const [examDate, setExamDate] = useState(""); // YYYY-MM-DD
    const [examTime, setExamTime] = useState(""); // HH:mm

    const [submitting, setSubmitting] = useState(false);

    // --- Học kì ---
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [loadingPeriods, setLoadingPeriods] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<Semester | null>(null);

    // --- Date chips ---
    const dateRange = useMemo(() => {
        if (!selectedPeriod) return [];
        return generateDateRange(selectedPeriod.start_date, selectedPeriod.end_date);
    }, [selectedPeriod]);

    // --- Room combobox ---
    const [rooms, setRooms] = useState<Room[]>([]);
    const [roomSearch, setRoomSearch] = useState("");
    const [isSearchingRoom, setIsSearchingRoom] = useState(false);
    const [showRoomDropdown, setShowRoomDropdown] = useState(false);
    const roomDropdownRef = useRef<HTMLDivElement>(null);

    // --- Subject combobox ---
    const [subjectSearch, setSubjectSearch] = useState("");
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isSearchingSubject, setIsSearchingSubject] = useState(false);
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
    const subjectDropdownRef = useRef<HTMLDivElement>(null);

    // Đóng dropdown khi click ra ngoài
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target as Node)) {
                setShowSubjectDropdown(false);
            }
            if (roomDropdownRef.current && !roomDropdownRef.current.contains(event.target as Node)) {
                setShowRoomDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Fetch học kì ---
    const fetchPeriods = useCallback(async () => {
        setLoadingPeriods(true);
        try {
            const res = await api.get("/semesters", { params: { limit: 100 } });
            setSemesters(res.data?.data || []);
        } catch {
            console.error("Lỗi tải học kì");
        } finally {
            setLoadingPeriods(false);
        }
    }, []);

    // --- Fetch rooms (debounced) ---
    const fetchRooms = useCallback(async () => {
        if (!roomSearch || roomSearch.length < 1 || !showRoomDropdown) {
            if (!roomSearch) setRooms([]);
            return;
        }
        setIsSearchingRoom(true);
        try {
            const res = await api.get("/rooms", {
                params: { search: roomSearch, limit: 10 },
            });
            setRooms(res.data?.data || []);
        } catch (error) {
            console.error("Lỗi tìm kiếm phòng:", error);
        } finally {
            setIsSearchingRoom(false);
        }
    }, [roomSearch, showRoomDropdown]);

    useEffect(() => {
        const t = setTimeout(fetchRooms, roomSearch ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchRooms, roomSearch]);

    // Khởi tạo data khi mở modal
    useEffect(() => {
        if (open) {
            fetchPeriods();

            if (examSchedule) {
                const vnDatetimeLocal = examSchedule.start_time
                    ? toVNDatetimeLocal(examSchedule.start_time)
                    : "";
                const [datePart, timePart] = vnDatetimeLocal ? vnDatetimeLocal.split("T") : ["", ""];

                setFormData({
                    subject_code: examSchedule.subject?.subject_code ?? "",
                    group: examSchedule.group ?? 0,
                    start_time: vnDatetimeLocal,
                    duration: examSchedule.duration ?? 0,
                    room_code: examSchedule.room?.room_code ?? "",
                    note: examSchedule.note ?? "",
                    semester_id: examSchedule.semester?.id ?? "",
                });
                setExamDate(datePart ?? "");
                setExamTime(timePart ?? "");
                setSubjectSearch(
                    examSchedule.subject
                        ? `${examSchedule.subject.name} (${examSchedule.subject.subject_code})`
                        : ""
                );
                setRoomSearch(
                    examSchedule.room
                        ? `${examSchedule.room.name} (${examSchedule.room.room_code})`
                        : ""
                );

                // Set selected period for editing
                if (examSchedule.semester) {
                    setSelectedPeriod(examSchedule.semester);
                } else {
                    setSelectedPeriod(null);
                }
            } else {
                setFormData({
                    subject_code: "",
                    group: 0,
                    start_time: "",
                    duration: 0,
                    room_code: "",
                    note: "",
                    semester_id: "",
                });
                setExamDate("");
                setExamTime("");
                setSubjectSearch("");
                setRoomSearch("");
                setSelectedPeriod(null);
            }
            setSubjects([]);
            setShowSubjectDropdown(false);
        }
    }, [open, examSchedule, fetchPeriods]);

    // Ghép examDate + examTime thành formData.start_time
    useEffect(() => {
        if (examDate && examTime) {
            setFormData((prev) => ({ ...prev, start_time: `${examDate}T${examTime}` }));
        } else {
            setFormData((prev) => ({ ...prev, start_time: "" }));
        }
    }, [examDate, examTime]);



    // --- Fetch môn học (debounced) ---
    const fetchSubjects = useCallback(async () => {
        if (!subjectSearch || subjectSearch.length < 2 || !showSubjectDropdown) {
            if (!subjectSearch) setSubjects([]);
            return;
        }
        setIsSearchingSubject(true);
        try {
            const res = await api.get("/subjects", {
                params: {
                    search: subjectSearch,
                    limit: 10,
                    semester: (selectedPeriod?.semester_number === 1 || selectedPeriod?.semester_number === 2)
                        ? selectedPeriod.semester_number
                        : undefined
                },
            });
            setSubjects(res.data?.data || []);
        } catch (error) {
            console.error("Lỗi tìm kiếm môn học:", error);
        } finally {
            setIsSearchingSubject(false);
        }
    }, [subjectSearch, showSubjectDropdown, selectedPeriod]);

    useEffect(() => {
        const t = setTimeout(fetchSubjects, subjectSearch ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchSubjects, subjectSearch]);

    // --- Chọn học kì ---
    const handleSelectPeriod = (periodId: string) => {
        const period = semesters.find((p) => p.id === periodId) ?? null;
        setSelectedPeriod(period);
        setFormData((prev) => ({ ...prev, semester_id: periodId }));
        // Reset ngày + phòng + môn khi đổi học kì
        setExamDate("");
        setExamTime("");
        setFormData((prev) => ({ ...prev, room_code: "", subject_code: "" }));
        setRoomSearch("");
        setSubjectSearch("");
    };

    // --- Chọn ngày thi (date chip) ---
    const handleSelectDate = (date: string) => {
        setExamDate(date);
    };

    // --- Chọn phòng (combobox) ---
    const handleSelectRoom = (room: Room) => {
        setFormData((prev) => ({ ...prev, room_code: room.room_code }));
        setRoomSearch(`${room.name} (${room.room_code})`);
        setShowRoomDropdown(false);
    };

    // --- Chọn môn học ---
    const handleSelectSubject = (subject: Subject) => {
        setFormData((prev) => ({ ...prev, subject_code: subject.subject_code }));
        setSubjectSearch(`${subject.name} (${subject.subject_code})`);
        setShowSubjectDropdown(false);
    };



    // --- Submit ---
    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();

        // Validation: Ràng buộc giờ thi từ 7:00 AM đến 18:00 PM
        if (examTime) {
            const [h, m] = examTime.split(":").map(Number);
            const startMinutes = h * 60 + m;
            const endMinutes = startMinutes + formData.duration;

            const minAllowed = 7 * 60; // 7:00 AM
            const maxAllowed = 18 * 60; // 18:00 PM

            if (formData.duration < 45) {
                toast.error("Thời lượng thi không được nhỏ hơn 45 phút.");
                return;
            }
            if (formData.duration > 180) {
                toast.error("Thời lượng thi không được vượt quá 180 phút.");
                return;
            }

            if (startMinutes <= minAllowed) {
                toast.error("Giờ bắt đầu không hợp lệ! Ca thi phải bắt đầu sau 07:00 sáng.");
                return;
            }
            if (endMinutes >= maxAllowed) {
                toast.error(`Thời lượng không hợp lệ! Ca thi kéo dài đến ${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}, vượt quá giới hạn (phải kết thúc trước 18:00).`);
                return;
            }
        }

        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                start_time: fromVNDatetimeLocalToUTC(formData.start_time),
                semester_id: formData.semester_id || undefined,
            };
            if (examSchedule) {
                await api.patch(`/exam-schedules/${examSchedule.id}`, payload);
                toast.success("Cập nhật lịch thi thành công");
            } else {
                await api.post("/exam-schedules", payload);
                toast.success("Thêm lịch thi thành công");
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setSubmitting(false);
        }
    };



    return (
        <Modal
            open={open}
            onClose={onClose}
            title={examSchedule ? "Sửa lịch thi" : "Thêm lịch thi"}
            size="lg"
            footer={
                <>
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button type="submit" variant="primary" form="exam-schedule-form" loading={submitting}>
                        Lưu
                    </Button>
                </>
            }
        >
            <form id="exam-schedule-form" onSubmit={handleSubmit} className="space-y-5">

                {/* ══════════ STEP 1: Chọn học kì ══════════ */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <i className="ti ti-calendar-event text-sm text-slate-400" />
                        Học kì
                    </label>
                    {loadingPeriods ? (
                        <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                            <span className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin inline-block" />
                            Đang tải...
                        </div>
                    ) : (
                        <select
                            required
                            value={formData.semester_id}
                            onChange={(e) => handleSelectPeriod(e.target.value)}
                            className="w-full rounded-lg border text-sm text-slate-900 bg-white h-9 px-3 outline-none transition-colors border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        >
                            <option value="">— Chọn học kì —</option>
                            {semesters.map((p) => (
                                <option key={p.id} value={p.id}>
                                    Học kì {p.semester_number} - {p.academic_year}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* ══════════ STEP 2: Chọn ngày thi (Date chips) ══════════ */}
                {selectedPeriod && (
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                            <i className="ti ti-calendar text-sm text-slate-400" />
                            Ngày thi
                            <span className="text-xs text-slate-400 font-normal ml-1">
                                ({dateRange.length} ngày)
                            </span>
                        </label>

                        {dateRange.length <= 30 ? (
                            /* ── Chip grid (≤ 30 ngày) ── */
                            <div className="flex flex-wrap gap-1.5">
                                {dateRange.map((date) => {
                                    const { dayName, date: dateStr } = formatDateChip(date);
                                    const isSelected = examDate === date;
                                    const isWeekend = dayjs(date).day() === 0;

                                    return (
                                        <button
                                            key={date}
                                            type="button"
                                            onClick={() => handleSelectDate(date)}
                                            className={`
                                                flex flex-col items-center gap-0.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-150
                                                ${isSelected
                                                    ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold shadow-sm ring-2 ring-blue-100"
                                                    : isWeekend
                                                        ? "border-slate-200 bg-orange-50/50 text-slate-500 hover:border-slate-300 hover:bg-orange-50"
                                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                                }
                                            `}
                                        >
                                            <span className={`text-[10px] font-medium ${isSelected ? "text-blue-500" : "text-slate-400"}`}>
                                                {dayName}
                                            </span>
                                            <span>{dateStr}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            /* ── Fallback date picker (> 21 ngày) ── */
                            <Input
                                type="date"
                                required
                                value={examDate}
                                min={toYMD(selectedPeriod.start_date)}
                                max={toYMD(selectedPeriod.end_date)}
                                onChange={(e) => handleSelectDate(e.target.value)}
                            />
                        )}
                    </div>
                )}

                {/* ══════════ STEP 3: Giờ bắt đầu ══════════ */}
                {examDate && (
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                            <i className="ti ti-clock text-sm text-slate-400" />
                            Giờ bắt đầu
                        </label>
                        <Input
                            type="time"
                            required
                            value={examTime}
                            onChange={(e) => setExamTime(e.target.value)}
                            className="max-w-[200px]"
                        />
                    </div>
                )}

                {/* ══════════ STEP 4: Chọn phòng (combobox) ══════════ */}
                <div className="flex flex-col gap-1.5" ref={roomDropdownRef}>
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <i className="ti ti-door text-sm text-slate-400" />
                        Phòng thi
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            required
                            placeholder="Gõ tên hoặc mã phòng để tìm..."
                            value={roomSearch}
                            onFocus={() => setShowRoomDropdown(true)}
                            onChange={(e) => {
                                setRoomSearch(e.target.value);
                                setShowRoomDropdown(true);
                                if (e.target.value === "") setFormData((prev) => ({ ...prev, room_code: "" }));
                            }}
                            className="w-full rounded-lg border text-sm text-slate-900 bg-white h-9 px-3 outline-none transition-colors border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        />
                        {isSearchingRoom && (
                            <div className="absolute right-3 top-2.5">
                                <span className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin inline-block" />
                            </div>
                        )}
                        {showRoomDropdown && roomSearch.length >= 1 && (
                            <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-md max-h-52 overflow-y-auto">
                                {!isSearchingRoom && rooms.length === 0 ? (
                                    <li className="px-4 py-3 text-sm text-slate-500 text-center">
                                        Không tìm thấy phòng nào
                                    </li>
                                ) : (
                                    rooms.map((room) => (
                                        <li
                                            key={room.room_code}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleSelectRoom(room);
                                            }}
                                            className={`px-3 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 flex flex-col ${formData.room_code === room.room_code ? "bg-blue-50" : ""
                                                }`}
                                        >
                                            <span className="text-sm font-medium text-slate-800">{room.name}</span>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span>{room.room_code}</span>
                                                <span className="text-slate-300">•</span>
                                                <span>{room.capacity} chỗ</span>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                    </div>
                </div>

                {/* ══════════ STEP 5: Chọn môn học — combobox ══════════ */}
                <div className="flex flex-col gap-1.5" ref={subjectDropdownRef}>
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <i className="ti ti-book text-sm text-slate-400" />
                        Môn học
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            required
                            placeholder="Gõ tên hoặc mã môn học để tìm..."
                            value={subjectSearch}
                            onFocus={() => setShowSubjectDropdown(true)}
                            onChange={(e) => {
                                setSubjectSearch(e.target.value);
                                setShowSubjectDropdown(true);
                                if (e.target.value === "") setFormData((prev) => ({ ...prev, subject_code: "" }));
                            }}
                            disabled={!selectedPeriod}
                            className={`w-full rounded-lg border text-sm text-slate-900 bg-white h-9 px-3 outline-none transition-colors border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 ${!selectedPeriod ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
                        />
                        {!selectedPeriod && (
                            <p className="text-xs text-orange-500 mt-1">Vui lòng chọn học kì trước</p>
                        )}
                        {isSearchingSubject && (
                            <div className="absolute right-3 top-2.5">
                                <span className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin inline-block" />
                            </div>
                        )}
                        {showSubjectDropdown && subjectSearch.length >= 2 && (
                            <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-md max-h-52 overflow-y-auto">
                                {!isSearchingSubject && subjects.length === 0 ? (
                                    <li className="px-4 py-3 text-sm text-slate-500 text-center">
                                        Không tìm thấy môn học nào
                                    </li>
                                ) : (
                                    subjects.map((subject) => (
                                        <li
                                            key={subject.subject_code}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleSelectSubject(subject);
                                            }}
                                            className={`px-3 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 flex flex-col ${formData.subject_code === subject.subject_code ? "bg-blue-50" : ""
                                                }`}
                                        >
                                            <span className="text-sm font-medium text-slate-800">{subject.name}</span>
                                            <span className="text-xs text-slate-500">{subject.subject_code}</span>
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                    </div>
                </div>

                {/* ══════════ STEP 6: Nhóm thi ══════════ */}
                <Input
                    label="Nhóm thi"
                    type="number"
                    required
                    min={1}
                    value={formData.group || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, group: Number(e.target.value) }))}
                    placeholder="Ví dụ: 1"
                />

                {/* ══════════ STEP 7: Thời lượng (phút) ══════════ */}
                <div className="flex flex-col gap-1.5">
                    <Input
                        label="Thời lượng (phút)"
                        type="number"
                        required
                        min={1}
                        value={formData.duration || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, duration: Number(e.target.value) }))}
                        placeholder="Ví dụ: 90"
                    />
                    <div className="flex flex-wrap gap-1.5">
                        {DURATION_PRESETS.map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, duration: preset }))}
                                className={`text-xs rounded-full border px-2.5 py-1 transition-colors ${formData.duration === preset
                                    ? "border-blue-500 bg-blue-50 text-blue-600 font-medium"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                                    }`}
                            >
                                {preset}p
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══════════ STEP 8: Ghi chú ══════════ */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Ghi chú</label>
                    <textarea
                        value={formData.note}
                        onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                        placeholder="Nhập ghi chú (nếu có)..."
                        rows={3}
                        className="w-full rounded-lg border text-sm text-slate-900 bg-white px-3 py-2 outline-none transition-colors border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 resize-none"
                    />
                </div>

            </form>
        </Modal>
    );
}