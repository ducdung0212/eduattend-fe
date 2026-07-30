"use client"

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { todayString, formatDateVN, addDays, formatTime, toYMD } from "@/lib/utils";
import { ExamPeriod, ExamSchedule } from "@/types";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ExamScheduleFormModal } from "./_components/ExamScheduleFormModal";
import { DatePickerWithHighlight } from "./_components/DatePickerWithHighlight";
import { ExamScheduleImportModal } from "./_components/ExamScheduleImportModal";
import { ExamSupervisorModal } from "./_components/ExamSupervisorModal";
import { AttendanceRecordModal } from "./_components/AttendanceRecordModal";
import { ExamScheduleGridView } from "./_components/ExamScheduleGridView";
import { ExamPeriodManagerModal } from "./_components/ExamPeriodManagerModal";
import { Input } from "@/components/ui/Input";
import * as XLSX from "xlsx";
import { ExamDetailView } from "@/components/shared/ExamDetailView";
import { formatDateTime } from "@/lib/utils";

export default function ExamScheduleManagementPage() {
    // --- State Modals ---
    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [periodManagerOpen, setPeriodManagerOpen] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportSelectedPeriodId, setExportSelectedPeriodId] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [attendanceRecordModal, setAttendanceRecordModal] = useState<ExamSchedule | null>(null);
    const [examSupervisorModal, setExamSupervisorModal] = useState<ExamSchedule | null>(null);
    const [editingExamSchedule, setEditingExamSchedule] = useState<ExamSchedule | null>(null);
    const [scheduleToDelete, setScheduleToDelete] = useState<ExamSchedule | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [viewState, setViewState] = useState<{ view: "list" } | { view: "detail"; schedule: ExamSchedule }>({ view: "list" });

    // --- State Data ---
    const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
    const [loading, setLoading] = useState(true);

    // --- State Filters ---
    const [gridDate, setGridDate] = useState(todayString());

    // --- Đợt thi filter ---
    const [examPeriods, setExamPeriods] = useState<ExamPeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
    const [periodHighlightedDates, setPeriodHighlightedDates] = useState<string[]>([]);
    const [isDateResolved, setIsDateResolved] = useState(false);

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

    useEffect(() => {
        setIsDateResolved(false);
        // Fetch tất cả lịch thi (hoặc theo đợt) để lấy các ngày có ca thi
        api.get("/exam-schedules", {
            params: {
                exam_period_id: selectedPeriodId || undefined,
                limit: 1000,
            },
        })
        .then((res) => {
            const schedules = res.data?.data || [];
            // Lọc các ngày và sort giảm dần để lấy ngày mới nhất
            const dates = Array.from(
                new Set(
                    schedules
                        .filter((s: ExamSchedule) => s.start_time)
                        .map((s: ExamSchedule) => toYMD(s.start_time))
                )
            ).sort((a, b) => (b as string).localeCompare(a as string)) as string[];
            
            setPeriodHighlightedDates(dates);

            // Tự động chuyển sang ngày có ca thi mới nhất
            if (dates.length > 0) {
                setGridDate(dates[0]);
            } else if (selectedPeriodId) {
                // Nếu đợt thi rỗng, về ngày bắt đầu đợt thi
                const p = examPeriods.find(x => x.id === selectedPeriodId);
                if (p && p.start_date) setGridDate(toYMD(p.start_date));
            } else {
                // Nếu 'Tất cả' rỗng, về hôm nay
                setGridDate(todayString());
            }
        })
        .catch((e) => console.error("Lỗi lấy danh sách ngày có ca thi", e))
        .finally(() => setIsDateResolved(true));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPeriodId]);

    // Fetch danh sách lịch thi
    const fetchExamSchedules = useCallback(async () => {
        if (!isDateResolved) return;
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
    }, [gridDate, selectedPeriodId, isDateResolved]);

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

    // Các ngày có ca thi (dùng để highlight trong date picker)
    const highlightedDates = periodHighlightedDates;

    // Kiểm tra giới hạn nút ‹ / › ngày
    const canGoPrevDay = !selectedPeriod || gridDate > toYMD(selectedPeriod.start_date);
    const canGoNextDay = !selectedPeriod || gridDate < toYMD(selectedPeriod.end_date);

    const handleExportPeriod = async () => {
        if (!exportSelectedPeriodId) {
            toast.error("Vui lòng chọn đợt thi");
            return;
        }
        setIsExporting(true);
        const periodToExport = examPeriods.find((p) => p.id === exportSelectedPeriodId);
        const toastId = toast.loading("Đang tổng hợp dữ liệu ca thi, vui lòng đợi...");
        try {
            const resSchedules = await api.get("/exam-schedules", {
                params: {
                    exam_period_id: exportSelectedPeriodId,
                    limit: 1000,
                },
            });
            const schedules = resSchedules.data?.data as ExamSchedule[] || [];
            if (schedules.length === 0) {
                toast.error("Đợt thi này không có ca thi nào", { id: toastId });
                return;
            }

            const wb = XLSX.utils.book_new();

            for (const sch of schedules) {
                const resRecords = await api.get("/attendance-records", {
                    params: { exam_schedule_id: sch.id, limit: 100 },
                });
                const rawRecords = resRecords.data?.data as any[] || [];
                
                // Sắp xếp ưu tiên: Lớp -> Tên -> Họ
                const records = [...rawRecords].sort((a, b) => {
                    const classA = a.student?.class?.name || a.student?.class?.class_code || "";
                    const classB = b.student?.class?.name || b.student?.class?.class_code || "";
                    if (classA !== classB) return classA.localeCompare(classB);

                    const nameA = a.student?.first_name || "";
                    const nameB = b.student?.first_name || "";
                    if (nameA !== nameB) return nameA.localeCompare(nameB);

                    const lastA = a.student?.last_name || "";
                    const lastB = b.student?.last_name || "";
                    return lastA.localeCompare(lastB);
                });

                let present = 0;
                let late = 0;
                let excused = 0;
                let absent = 0;

                records.forEach((r) => {
                    if (r.status === "present" || (r.status !== "late" && r.status !== "excused" && r.attendance_time)) {
                        present++;
                    } else if (r.status === "late") {
                        late++;
                    } else if (r.status === "excused") {
                        excused++;
                    } else {
                        absent++;
                    }
                });

                const totalStudents = records.length;
                const totalPresent = present + late; // Đi muộn tính vào có mặt

                const aoaData: any[][] = [];
                // Thông tin ca thi ở đầu sheet
                aoaData.push(["THÔNG TIN CA THI"]);
                aoaData.push(["Môn thi:", sch.subject?.name || "", "", "Mã môn:", sch.subject?.subject_code || ""]);
                aoaData.push(["Phòng thi:", sch.room?.name || sch.room?.room_code || "", "", "Ngày thi:", sch.start_time ? formatDateVN(toYMD(sch.start_time)) : ""]);
                aoaData.push(["Giờ bắt đầu:", sch.start_time ? formatTime(sch.start_time) : "", "", "Thời lượng:", `${sch.duration || 120} phút`]);
                aoaData.push(["Nhóm/Ca thi:", sch.group || "", "", "Giám thị:", (sch.supervisors || []).join(", ") || "Chưa phân công"]);
                aoaData.push([]); // Dòng trống
                
                // Thống kê điểm danh
                aoaData.push(["THỐNG KÊ ĐIỂM DANH"]);
                aoaData.push(["Tổng thí sinh:", totalStudents]);
                aoaData.push(["Có mặt:", totalPresent]);
                aoaData.push(["Vắng mặt:", absent]);
                aoaData.push(["Đi muộn:", late]);
                aoaData.push(["Có phép:", excused]);
                aoaData.push([]); // Dòng trống

                // Tiêu đề bảng điểm danh
                aoaData.push(["STT", "Mã SV", "Họ tên", "Lớp", "Trạng thái", "Thời gian điểm danh", "Ghi chú"]);

                // Dữ liệu điểm danh
                records.forEach((r, index) => {
                    aoaData.push([
                        index + 1,
                        r.student?.student_code || "",
                        `${r.student?.last_name || ""} ${r.student?.first_name || ""}`.trim(),
                        r.student?.class?.name || r.student?.class?.class_code || "",
                        r.status === "present" ? "Có mặt" : r.status === "late" ? "Đi muộn" : r.status === "excused" ? "Có phép" : (r.attendance_time ? "Có mặt" : "Vắng mặt"),
                        r.attendance_time ? formatDateTime(r.attendance_time) : "",
                        r.note || "",
                    ]);
                });

                const ws = XLSX.utils.aoa_to_sheet(aoaData);
                
                // Merge cell cho tiêu đề
                ws["!merges"] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // THÔNG TIN CA THI
                    { s: { r: 6, c: 0 }, e: { r: 6, c: 6 } }  // THỐNG KÊ ĐIỂM DANH
                ];

                ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 25 }, { wch: 20 }];

                let sheetName = `${sch.subject?.subject_code || "M"}_P${sch.room?.room_code || "X"}_Ca${sch.group || 1}`;
                if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);
                
                let finalSheetName = sheetName;
                let counter = 1;
                while (wb.SheetNames.includes(finalSheetName)) {
                    finalSheetName = `${sheetName.substring(0, 28)}_${counter}`;
                    counter++;
                }
                XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
            }

            XLSX.writeFile(wb, `CaThi_${periodToExport?.name || "DotThi"}.xlsx`);
            toast.success("Xuất dữ liệu thành công", { id: toastId, duration: 5000 });
            setExportModalOpen(false);
            setExportSelectedPeriodId("");
        } catch (err) {
            console.error(err);
            toast.error("Lỗi khi xuất dữ liệu", { id: toastId, duration: 5000 });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-medium text-slate-900 tracking-tight">Quản lý lịch thi</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Tổng quan và quản lý lịch thi trong hệ thống</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" leftIcon="file-spreadsheet" onClick={() => setExportModalOpen(true)} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300">Xuất Excel</Button>
                    <Button variant="secondary" leftIcon="calendar-event" onClick={() => setPeriodManagerOpen(true)}>Đợt thi</Button>
                    <Button variant="secondary" leftIcon="upload" onClick={() => setImportModalOpen(true)}>Import Excel</Button>
                    <Button variant="primary" leftIcon="plus" onClick={() => handleOpenModal()}>Thêm lịch thi</Button>
                </div>
            </div>

            <div className="bg-white border border-slate-200/70 rounded-xl">
                {viewState.view === "list" ? (
                    <>
                        {/* Toolbar — Bộ lọc */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap bg-slate-50/50 rounded-t-xl">
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
                                    onClick={() => canGoPrevDay && setGridDate(addDays(gridDate, -1))}
                                    disabled={!canGoPrevDay}
                                    className={[
                                        "h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 text-lg leading-none transition-colors",
                                        canGoPrevDay ? "hover:bg-slate-50 cursor-pointer" : "opacity-30 cursor-not-allowed",
                                    ].join(" ")}
                                    aria-label="Ngày trước"
                                >
                                    ‹
                                </button>
                                <span className="text-sm font-medium text-slate-700 min-w-[190px] text-center">
                                    {formatDateVN(gridDate)}
                                </span>
                                <button
                                    onClick={() => canGoNextDay && setGridDate(addDays(gridDate, 1))}
                                    disabled={!canGoNextDay}
                                    className={[
                                        "h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 text-lg leading-none transition-colors",
                                        canGoNextDay ? "hover:bg-slate-50 cursor-pointer" : "opacity-30 cursor-not-allowed",
                                    ].join(" ")}
                                    aria-label="Ngày sau"
                                >
                                    ›
                                </button>
                                <DatePickerWithHighlight
                                    value={gridDate}
                                    onChange={setGridDate}
                                    highlightedDates={highlightedDates}
                                    minDate={selectedPeriod ? toYMD(selectedPeriod.start_date) : undefined}
                                    maxDate={selectedPeriod ? toYMD(selectedPeriod.end_date) : undefined}
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
                                <span className="text-blue-400">:</span>
                                <span>
                                    {new Date(selectedPeriod.start_date).toLocaleDateString("vi-VN")}
                                    {"-"}
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
                            onViewDetails={(schedule) => setViewState({ view: "detail", schedule })}
                        />
                    </>
                ) : (
                    <div className="p-4">
                        <ExamDetailView
                            schedule={viewState.schedule}
                            onBack={() => setViewState({ view: "list" })}
                            hideAttendanceButton={true}
                        />
                    </div>
                )}
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
                open={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                title="Chọn đợt thi để xuất Excel"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setExportModalOpen(false)} disabled={isExporting}>Hủy</Button>
                        <Button variant="primary" onClick={handleExportPeriod} disabled={!exportSelectedPeriodId || isExporting} loading={isExporting}>Xuất dữ liệu</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Đợt thi <span className="text-red-500">*</span></label>
                        <select
                            value={exportSelectedPeriodId}
                            onChange={(e) => setExportSelectedPeriodId(e.target.value)}
                            disabled={isExporting}
                            className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-60 disabled:bg-slate-100"
                        >
                            <option value="" disabled>-- Chọn đợt thi --</option>
                            {examPeriods.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <p className="text-xs text-slate-500">
                        Hệ thống sẽ tổng hợp toàn bộ ca thi của đợt thi được chọn và xuất ra một file Excel, mỗi ca thi là một Sheet.
                    </p>
                </div>
            </Modal>
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