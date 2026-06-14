'use client';

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { fromVNDatetimeLocalToUTC, toVNDatetimeLocal } from "@/lib/utils";
import { ExamSchedule, Room, Subject } from "@/types";
import React, { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface ExamScheduleFormModalProps {
    open: boolean;
    examSchedule: ExamSchedule | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function ExamScheduleFormModal({ open, examSchedule, onClose, onSuccess }: ExamScheduleFormModalProps) {
    const [formData, setFormData] = useState({
        subject_code: "",
        group: 0,
        start_time: "",
        duration: 0,
        room_code: "",
        note: "",
    });

    const [submitting, setSubmitting] = useState(false);

    // --- Subject combobox ---
    const [subjectSearch, setSubjectSearch] = useState("");
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isSearchingSubject, setIsSearchingSubject] = useState(false);
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
    const subjectDropdownRef = useRef<HTMLDivElement>(null);

    // --- Room combobox ---
    const [roomSearch, setRoomSearch] = useState("");
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isSearchingRoom, setIsSearchingRoom] = useState(false);
    const [showRoomDropdown, setShowRoomDropdown] = useState(false);
    const roomDropdownRef = useRef<HTMLDivElement>(null);

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

    // Khởi tạo data khi mở modal
    useEffect(() => {
        if (open) {
            if (examSchedule) {
                setFormData({
                    subject_code: examSchedule.subject?.subject_code ?? "",
                    group: examSchedule.group ?? 0,
                    start_time: examSchedule.start_time
                        ? toVNDatetimeLocal(examSchedule.start_time)
                        : "",
                    duration: examSchedule.duration ?? 0,
                    room_code: examSchedule.room?.room_code ?? "",
                    note: examSchedule.note ?? "",
                });
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
            } else {
                setFormData({
                    subject_code: "",
                    group: 0,
                    start_time: "",
                    duration: 0,
                    room_code: "",
                    note: "",
                });
                setSubjectSearch("");
                setRoomSearch("");
            }
            setSubjects([]);
            setRooms([]);
            setShowSubjectDropdown(false);
            setShowRoomDropdown(false);
        }
    }, [open, examSchedule]);

    // --- Fetch môn học (debounced) ---
    const fetchSubjects = useCallback(async () => {
        if (!subjectSearch || subjectSearch.length < 2 || !showSubjectDropdown) {
            if (!subjectSearch) setSubjects([]);
            return;
        }
        setIsSearchingSubject(true);
        try {
            const res = await api.get("/subjects", {
                params: { search: subjectSearch, limit: 10 },
            });
            setSubjects(res.data?.data || []);
        } catch (error) {
            console.error("Lỗi tìm kiếm môn học:", error);
        } finally {
            setIsSearchingSubject(false);
        }
    }, [subjectSearch, showSubjectDropdown]);

    useEffect(() => {
        const t = setTimeout(fetchSubjects, subjectSearch ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchSubjects, subjectSearch]);

    // --- Fetch phòng thi (debounced) ---
    const fetchRooms = useCallback(async () => {
        if (!roomSearch || roomSearch.length < 2 || !showRoomDropdown) {
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
            console.error("Lỗi tìm kiếm phòng thi:", error);
        } finally {
            setIsSearchingRoom(false);
        }
    }, [roomSearch, showRoomDropdown]);

    useEffect(() => {
        const t = setTimeout(fetchRooms, roomSearch ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchRooms, roomSearch]);

    // --- Chọn môn học ---
    const handleSelectSubject = (subject: Subject) => {
        setFormData((prev) => ({ ...prev, subject_code: subject.subject_code }));
        setSubjectSearch(`${subject.name} (${subject.subject_code})`);
        setShowSubjectDropdown(false);
    };

    // --- Chọn phòng thi ---
    const handleSelectRoom = (room: Room) => {
        setFormData((prev) => ({ ...prev, room_code: room.room_code }));
        setRoomSearch(`${room.name} (${room.room_code})`);
        setShowRoomDropdown(false);
    };

    // --- Submit ---
    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                start_time: fromVNDatetimeLocalToUTC(formData.start_time),
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
            <form id="exam-schedule-form" onSubmit={handleSubmit} className="space-y-4">

                {/* Chọn môn học — combobox */}
                <div className="flex flex-col gap-1.5" ref={subjectDropdownRef}>
                    <label className="text-sm font-medium text-slate-700">Môn học</label>
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
                            className="w-full rounded-lg border text-sm text-slate-900 bg-white h-9 px-3 outline-none transition-colors border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        />
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

                {/* Chọn phòng thi — combobox */}
                <div className="flex flex-col gap-1.5" ref={roomDropdownRef}>
                    <label className="text-sm font-medium text-slate-700">Phòng thi</label>
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
                        {showRoomDropdown && roomSearch.length >= 2 && (
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
                                            <span className="text-xs text-slate-500">{room.room_code}</span>
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Nhóm thi */}
                <Input
                    label="Nhóm thi"
                    type="number"
                    required
                    min={1}
                    value={formData.group || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, group: Number(e.target.value) }))}
                    placeholder="Ví dụ: 1"
                />

                {/* Thời gian bắt đầu */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Thời gian bắt đầu</label>
                    <input
                        type="datetime-local"
                        required
                        value={formData.start_time}
                        onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))}
                        className="w-full rounded-lg border text-sm text-slate-900 bg-white h-9 px-3 outline-none transition-colors border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                </div>

                {/* Thời lượng (phút) */}
                <Input
                    label="Thời lượng (phút)"
                    type="number"
                    required
                    min={1}
                    value={formData.duration || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, duration: Number(e.target.value) }))}
                    placeholder="Ví dụ: 90"
                />

                {/* Ghi chú */}
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