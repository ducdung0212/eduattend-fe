"use client"

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { todayString, formatDateVN, addDays } from "@/lib/utils";
import { ExamPeriod, ExamSchedule } from "@/types";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ExamScheduleFormModal } from "./_components/ExamScheduleFormModal";
import { ExamScheduleImportModal } from "./_components/ExamScheduleImportModal";
import { ExamSupervisorModal } from "./_components/ExamSupervisorModal";
import { AttendanceRecordModal } from "./_components/AttendanceRecordModal";
import { ExamScheduleGridView } from "./_components/ExamScheduleGridView";
import { ExamPeriodManagerModal } from "./_components/ExamPeriodManagerModal";
import { Input } from "@/components/ui/Input";

export default function ExamScheduleManagementPage() {
    // --- State Modals ---
    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [periodManagerOpen, setPeriodManagerOpen] = useState(false);
    const [attendanceRecordModal, setAttendanceRecordModal] = useState<ExamSchedule | null>(null);
    const [examSupervisorModal, setExamSupervisorModal] = useState<ExamSchedule | null>(null);
    const [editingExamSchedule, setEditingExamSchedule] = useState<ExamSchedule | null>(null);
    const [scheduleToDelete, setScheduleToDelete] = useState<ExamSchedule | null>(null);
    const [deleting, setDeleting] = useState(false);

    // --- State Data ---
    const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
    const [loading, setLoading] = useState(true);

    // --- State Filters ---
    const [gridDate, setGridDate] = useState(todayString());

    // --- Đợt thi filter ---
    const [examPeriods, setExamPeriods] = useState<ExamPeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");

    // Fetch đợt thi
    const fetchPeriods = useCallback(async () => {
        try {
            const res = await api.get("/exam-periods", { params: { limit: 100 } });
            setExamPeriods(res.data?.data || []);
        } catch {
            console.error("Lỗi tải đợt thi");
        }
    }, []);

    useEffect(() => {
        fetchPeriods();
    }, [fetchPeriods]);

    // Fetch danh sách lịch thi
    const fetchExamSchedules = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/exam-schedules", {
                params: {
                    page: 1,
                    limit: 999,
                    start_time: gridDate || undefined,
                    exam_period_id: selectedPeriodId || undefined,
                },
            });
            setExamSchedules(res.data?.data ?? []);
        } catch (e) {
            console.error("Lỗi khi tải danh sách lịch thi:", e);
            toast.error("Không thể tải danh sách lịch thi");
        } finally {
            setLoading(false);
        }
    }, [gridDate, selectedPeriodId]);

    useEffect(() => {
        fetchExamSchedules();
    }, [fetchExamSchedules]);

    // --- Handlers ---
    const handleOpenModal = useCallback((s?: ExamSchedule) => {
        setEditingExamSchedule(s || null);
        setModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setModalOpen(false);
        setEditingExamSchedule(null);
    }, []);

    const confirmDelete = async () => {
        if (!scheduleToDelete) return;
        setDeleting(true);
        try {
            await api.delete(`/exam-schedules/${scheduleToDelete.id}`);
            toast.success("Xóa lịch thi thành công");
            fetchExamSchedules();
            setScheduleToDelete(null);
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setDeleting(false);
        }
    };

    // Tìm đợt thi đang chọn (để hiển thị khoảng ngày)
    const selectedPeriod = examPeriods.find((p) => p.id === selectedPeriodId);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-medium text-slate-900 tracking-tight">Quản lý lịch thi</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Tổng quan và quản lý lịch thi trong hệ thống</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" leftIcon="calendar-event" onClick={() => setPeriodManagerOpen(true)}>Đợt thi</Button>
                    <Button variant="secondary" leftIcon="upload" onClick={() => setImportModalOpen(true)}>Import Excel</Button>
                    <Button variant="primary" leftIcon="plus" onClick={() => handleOpenModal()}>Thêm lịch thi</Button>
                </div>
            </div>

            <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
                {/* Toolbar — Bộ lọc */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap bg-slate-50/50">
                    {/* Lọc theo đợt thi */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Đợt thi:</label>
                        <select
                            value={selectedPeriodId}
                            onChange={(e) => setSelectedPeriodId(e.target.value)}
                            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 max-w-[220px]"
                        >
                            <option value="">Tất cả</option>
                            {examPeriods.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-5 bg-slate-200" />

                    {/* Lọc theo ngày */}
                    <div className="flex items-center gap-2 flex-1">
                        <button
                            onClick={() => setGridDate(addDays(gridDate, -1))}
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-lg leading-none"
                            aria-label="Ngày trước"
                        >
                            ‹
                        </button>
                        <span className="text-sm font-medium text-slate-700 min-w-[190px] text-center">
                            {formatDateVN(gridDate)}
                        </span>
                        <button
                            onClick={() => setGridDate(addDays(gridDate, 1))}
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-lg leading-none"
                            aria-label="Ngày sau"
                        >
                            ›
                        </button>
                        <Input
                            type="date"
                            value={gridDate}
                            onChange={(e) => setGridDate(e.target.value)}
                            className="h-8"
                        />
                        <Button
                            variant="secondary"
                            onClick={() => setGridDate(todayString())}
                            className="h-8"
                        >
                            Hôm nay
                        </Button>
                    </div>
                </div>

                {/* Badge hiển thị khoảng ngày đợt thi */}
                {selectedPeriod && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50/50 border-b border-blue-100 text-xs text-blue-700">
                        <i className="ti ti-calendar-event text-sm" />
                        <span className="font-medium">{selectedPeriod.name}</span>
                        <span className="text-blue-400">·</span>
                        <span>
                            {new Date(selectedPeriod.start_date).toLocaleDateString("vi-VN")}
                            {" → "}
                            {new Date(selectedPeriod.end_date).toLocaleDateString("vi-VN")}
                        </span>
                    </div>
                )}

                {/* Nội dung — Grid View */}
                <ExamScheduleGridView
                    examSchedules={examSchedules}
                    loading={loading}
                    onEdit={handleOpenModal}
                    onDelete={setScheduleToDelete}
                    onManageStudents={setAttendanceRecordModal}
                    onManageSupervisors={setExamSupervisorModal}
                />
            </div>

            {/* Modals */}
            <ExamScheduleFormModal
                open={modalOpen}
                onClose={handleCloseModal}
                examSchedule={editingExamSchedule}
                onSuccess={fetchExamSchedules}
            />
            <ExamScheduleImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={fetchExamSchedules}
            />
            <ExamSupervisorModal
                open={!!examSupervisorModal}
                examSchedule={examSupervisorModal}
                onClose={() => setExamSupervisorModal(null)}
                onSuccess={fetchExamSchedules}
            />
            <AttendanceRecordModal
                open={!!attendanceRecordModal}
                examSchedule={attendanceRecordModal}
                onClose={() => setAttendanceRecordModal(null)}
                onSuccess={fetchExamSchedules}
            />
            <ExamPeriodManagerModal
                open={periodManagerOpen}
                onClose={() => setPeriodManagerOpen(false)}
                onSuccess={fetchPeriods}
            />
            <Modal
                open={!!scheduleToDelete}
                onClose={() => setScheduleToDelete(null)}
                title="Xác nhận xóa"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setScheduleToDelete(null)}>Hủy</Button>
                        <Button variant="danger" loading={deleting} onClick={confirmDelete}>Xóa</Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600">
                    Bạn có chắc chắn muốn xóa lịch thi môn{" "}
                    <span className="font-semibold text-slate-900">{scheduleToDelete?.subject?.name}</span>{" "}
                    nhóm <span className="font-semibold text-slate-900">{scheduleToDelete?.group}</span> không? Hành động này không thể hoàn tác.
                </p>
            </Modal>
        </div>
    );
}