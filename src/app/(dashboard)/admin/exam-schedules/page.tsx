"use client"

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { todayString, formatDateVN, addDays, formatTime, toYMD } from "@/lib/utils";
import { Semester, ExamSchedule } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ExamScheduleFormModal } from "./_components/ExamScheduleFormModal";
import { DatePickerWithHighlight } from "./_components/DatePickerWithHighlight";
import { ExamScheduleImportModal } from "./_components/ExamScheduleImportModal";
import { ExamSupervisorModal } from "./_components/ExamSupervisorModal";
import { AttendanceRecordModal } from "./_components/AttendanceRecordModal";
import { ExamScheduleGridView } from "./_components/ExamScheduleGridView";
import { SemesterManagerModal } from "./_components/SemesterManagerModal";
import { Input } from "@/components/ui/Input";
import * as XLSX from "xlsx-js-style";
import { ExamDetailView } from "@/components/shared/ExamDetailView";
import { formatDateTime } from "@/lib/utils";

const LIMIT=100;

export default function ExamScheduleManagementPage() {
    // --- State Modals ---
    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [semesterManagerOpen, setSemesterManagerOpen] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportSelectedSemesterId, setExportSelectedSemesterId] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [attendanceRecordModal, setAttendanceRecordModal] = useState<ExamSchedule | null>(null);
    const [examSupervisorModal, setExamSupervisorModal] = useState<ExamSchedule | null>(null);
    const [editingExamSchedule, setEditingExamSchedule] = useState<ExamSchedule | null>(null);
    const [scheduleToDelete, setScheduleToDelete] = useState<ExamSchedule | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [viewState, setViewState] = useState<{ view: "list" } | { view: "detail"; schedule: ExamSchedule }>({ view: "list" });

    // --- State Bulk Delete ---
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

    // --- State Data ---
    const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
    const [loading, setLoading] = useState(true);

    // --- State Filters ---
    const [gridDate, setGridDate] = useState(todayString());

    // --- Học kì filter ---
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
    const [periodHighlightedDates, setPeriodHighlightedDates] = useState<string[]>([]);
    const [isDateResolved, setIsDateResolved] = useState(false);

    // Fetch học kì
    const fetchSemesters = useCallback(async () => {
        try {
            const res = await api.get("/semesters", { params: { limit: LIMIT } });
            setSemesters(res.data?.data || []);
        } catch {
            console.error("Lỗi tải học kì");
        }
    }, []);

    useEffect(() => {
        fetchSemesters();
    }, [fetchSemesters]);

    useEffect(() => {
        setIsDateResolved(false);
        // Fetch tất cả lịch thi (hoặc theo học kì) để lấy các ngày có ca thi
        api.get("/exam-schedules", {
            params: {
                semester_id: selectedSemesterId || undefined,
                limit: LIMIT,
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
                } else if (selectedSemesterId) {
                    // Nếu học kì rỗng, về ngày bắt đầu học kì
                    const p = semesters.find(x => x.id === selectedSemesterId);
                    if (p && p.start_date) setGridDate(toYMD(p.start_date));
                } else {
                    // Nếu 'Tất cả' rỗng, về hôm nay
                    setGridDate(todayString());
                }
            })
            .catch((e) => console.error("Lỗi lấy danh sách ngày có ca thi", e))
            .finally(() => setIsDateResolved(true));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSemesterId]);

    // Fetch danh sách lịch thi
    const fetchExamSchedules = useCallback(async () => {
        if (!isDateResolved) return;
        setLoading(true);
        try {
            const res = await api.get("/exam-schedules", {
                params: {
                    page: 1,
                    limit: LIMIT,
                    start_time: gridDate || undefined,
                    semester_id: selectedSemesterId || undefined,
                },
            });
            setExamSchedules(res.data?.data ?? []);
        } catch (e) {
            console.error("Lỗi khi tải danh sách lịch thi:", e);
            toast.error("Không thể tải danh sách lịch thi");
        } finally {
            setLoading(false);
        }
    }, [gridDate, selectedSemesterId, isDateResolved]);

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

    const handleBulkDelete = async () => {
        if (selectedKeys.length === 0) return;
        setBulkDeleteConfirm(false);

        setBulkDeleting(true);
        try {
            const res = await api.post("/exam-schedules/bulk-delete", { ids: selectedKeys });
            const { success, failed, errors } = res.data.data;
            if (failed > 0) {
                toast.error(`Xóa thành công ${success}, thất bại ${failed}`);
                console.error("Bulk delete errors:", errors);
            } else {
                toast.success(`Đã xóa thành công ${success} lịch thi`);
            }
            setSelectedKeys([]);
            fetchExamSchedules();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Lỗi khi xóa nhiều lịch thi");
        } finally {
            setBulkDeleting(false);
        }
    };

    // Tìm học kì đang chọn (để hiển thị khoảng ngày)
    const selectedSemester = semesters.find((p) => p.id === selectedSemesterId);

    // Các ngày có ca thi (dùng để highlight trong date picker)
    const highlightedDates = periodHighlightedDates;

    // Kiểm tra giới hạn nút ‹ / › ngày
    const canGoPrevDay = !selectedSemester || gridDate > toYMD(selectedSemester.start_date);
    const canGoNextDay = !selectedSemester || gridDate < toYMD(selectedSemester.end_date);

    // Thống kê nhanh cho ngày đang xem
    const dailyStats = useMemo(() => {
        const totalSchedules = examSchedules.length;
        const roomSet = new Set(examSchedules.map(s => s.room?.room_code).filter(Boolean));
        const totalStudents = examSchedules.reduce((sum, s) => sum + (s.attendance_count ?? 0), 0);
        return { totalSchedules, totalRooms: roomSet.size, totalStudents };
    }, [examSchedules]);

    const handleExportPeriod = async () => {
        if (!exportSelectedSemesterId) {
            toast.error("Vui lòng chọn học kì");
            return;
        }
        setIsExporting(true);
        const semesterToExport = semesters.find((p) => p.id === exportSelectedSemesterId);
        const toastId = toast.loading("Đang tổng hợp dữ liệu ca thi, vui lòng đợi...");
        try {
            const resSchedules = await api.get("/exam-schedules", {
                params: {
                    semester_id: exportSelectedSemesterId,
                    limit: 1000,
                },
            });
            const schedules = resSchedules.data?.data as ExamSchedule[] || [];
            if (schedules.length === 0) {
                toast.error("Học kì này không có ca thi nào", { id: toastId });
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
                let absent = 0;

                records.forEach((r) => {
                    const currentStatus = r.attendance_time ? "present" : "absent";
                    if (currentStatus === "present") present++;
                    else absent++;
                });

                const totalStudents = records.length;

                const aoaData: any[][] = [];
                // Header
                aoaData.push([{ v: "DANH SÁCH ĐIỂM DANH SINH VIÊN", t: "s", s: { font: { bold: true, sz: 14 }, alignment: { horizontal: "center" } } }, "", "", "", "", "", ""]);
                aoaData.push([]);

                // Thông tin ca thi dọc
                const infoStyle = { font: { bold: true } };
                const supervisorNames = (sch.supervisors || []).map(s => typeof s === 'string' ? s : `${(s as any).lecturer?.last_name || ""} ${(s as any).lecturer?.first_name || ""}`.trim()).join("\n") || "Chưa phân công";

                aoaData.push([
                    { v: "Môn thi:", t: "s", s: infoStyle }, { v: sch.subject?.name || "" }, "", "",
                    { v: "Tổng thí sinh:", t: "s", s: infoStyle }, { v: totalStudents }
                ]);
                aoaData.push([
                    { v: "Mã môn:", t: "s", s: infoStyle }, { v: sch.subject?.subject_code || "" }, "", "",
                    { v: "Có mặt:", t: "s", s: infoStyle }, { v: present }
                ]);
                aoaData.push([
                    { v: "Phòng thi:", t: "s", s: infoStyle }, { v: sch.room?.name || sch.room?.room_code || "" }, "", "",
                    { v: "Vắng mặt:", t: "s", s: infoStyle }, { v: absent }
                ]);
                aoaData.push([{ v: "Ngày thi:", t: "s", s: infoStyle }, { v: sch.start_time ? formatDateVN(toYMD(sch.start_time)) : "" }]);
                aoaData.push([{ v: "Thời gian:", t: "s", s: infoStyle }, { v: `${sch.start_time ? formatTime(sch.start_time) : ""} (${sch.duration || 120} phút)` }]);
                aoaData.push([{ v: "Nhóm/Ca thi:", t: "s", s: infoStyle }, { v: sch.group || "" }]);
                aoaData.push([
                    { v: "Giám thị:", t: "s", s: { font: { bold: true }, alignment: { vertical: "top", horizontal: "left" } } },
                    { v: supervisorNames, t: "s", s: { alignment: { wrapText: true, horizontal: "left", vertical: "top" } } }
                ]);
                aoaData.push([]);

                // Tiêu đề bảng điểm danh
                const headerStyle = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "4F81BD" } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } },
                    }
                };

                const cellStyle = {
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } },
                    },
                    alignment: { vertical: "center" }
                };

                const centerCellStyle = { ...cellStyle, alignment: { horizontal: "center", vertical: "center" } };

                aoaData.push([
                    { v: "STT", t: "s", s: headerStyle },
                    { v: "Mã SV", t: "s", s: headerStyle },
                    { v: "Họ và tên", t: "s", s: headerStyle },
                    { v: "", t: "s", s: headerStyle },
                    { v: "Lớp", t: "s", s: headerStyle },
                    { v: "Trạng thái", t: "s", s: headerStyle },
                    { v: "Thời gian điểm danh", t: "s", s: headerStyle },
                    { v: "Ghi chú", t: "s", s: headerStyle }
                ]);

                // Dữ liệu điểm danh
                records.forEach((r, index) => {
                    const isPresent = !!r.attendance_time;
                    aoaData.push([
                        { v: index + 1, t: "n", s: centerCellStyle },
                        { v: r.student?.student_code || "", t: "s", s: centerCellStyle },
                        { v: r.student?.last_name || "", t: "s", s: cellStyle },
                        { v: r.student?.first_name || "", t: "s", s: cellStyle },
                        { v: r.student?.class?.name || r.student?.class?.class_code || "", t: "s", s: centerCellStyle },
                        { v: isPresent ? "Có mặt" : "Vắng mặt", t: "s", s: centerCellStyle },
                        { v: r.attendance_time ? formatDateTime(r.attendance_time) : "", t: "s", s: centerCellStyle },
                        { v: r.note || "", t: "s", s: cellStyle },
                    ]);
                });

                const ws = XLSX.utils.aoa_to_sheet(aoaData);

                // Cập nhật font chữ Times New Roman cho tất cả các cell
                for (const cell in ws) {
                    if (cell[0] === '!') continue;
                    if (!ws[cell].s) ws[cell].s = {};
                    if (!ws[cell].s.font) ws[cell].s.font = {};
                    ws[cell].s.font.name = "Times New Roman";
                }

                // Merge cell cho tiêu đề
                ws["!merges"] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // THÔNG TIN CA THI
                    { s: { r: 10, c: 2 }, e: { r: 10, c: 3 } }, // Merge "Họ và tên"
                    { s: { r: 2, c: 1 }, e: { r: 2, c: 3 } },
                    { s: { r: 3, c: 1 }, e: { r: 3, c: 3 } },
                    { s: { r: 4, c: 1 }, e: { r: 4, c: 3 } },
                    { s: { r: 5, c: 1 }, e: { r: 5, c: 3 } },
                    { s: { r: 6, c: 1 }, e: { r: 6, c: 3 } },
                    { s: { r: 7, c: 1 }, e: { r: 7, c: 3 } },
                    { s: { r: 8, c: 1 }, e: { r: 8, c: 4 } }, // Giám thị
                ];

                ws['!cols'] = [
                    { wch: 12 }, // STT (rộng để cho label info)
                    { wch: 13 }, // Mã SV
                    { wch: 18 }, // Họ và tên đệm
                    { wch: 8 },  // Tên
                    { wch: 12 }, // Lớp
                    { wch: 10 }, // Trạng thái
                    { wch: 18 }, // Thời gian
                    { wch: 16 }, // Ghi chú
                ];

                ws['!rows'] = [];
                ws['!rows'][8] = { hpt: 16 * Math.max(1, sch.supervisors?.length || 1) }; // row 8 height

                // Setup trang in (Landscape = ngang)
                ws['!pageSetup'] = { orientation: 'landscape', paperSize: 9 };

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

            XLSX.writeFile(wb, `CaThi_HK${semesterToExport?.semester_number}_${semesterToExport?.academic_year}.xlsx`);
            toast.success("Xuất dữ liệu thành công", { id: toastId, duration: 5000 });
            setExportModalOpen(false);
            setExportSelectedSemesterId("");
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
                    <Button variant="secondary" leftIcon="calendar-event" onClick={() => setSemesterManagerOpen(true)}>Học kì</Button>
                    <Button variant="secondary" leftIcon="upload" onClick={() => setImportModalOpen(true)}>Import Excel</Button>
                    <Button variant="primary" leftIcon="plus" onClick={() => handleOpenModal()}>Thêm lịch thi</Button>
                </div>
            </div>

            <div className="bg-white border border-slate-200/70 rounded-xl">
                {viewState.view === "list" ? (
                    <>
                        {/* Toolbar — Bộ lọc */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap bg-slate-50/50 rounded-t-xl">
                            {/* Lọc theo học kì */}
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-slate-500 whitespace-nowrap">Học kì:</label>
                                <select
                                    value={selectedSemesterId}
                                    onChange={(e) => setSelectedSemesterId(e.target.value)}
                                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 max-w-[220px]"
                                >
                                    <option value="">Tất cả</option>
                                    {semesters.map((p) => (
                                        <option key={p.id} value={p.id}>Học kì {p.semester_number} - {p.academic_year}</option>
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
                                    minDate={selectedSemester ? toYMD(selectedSemester.start_date) : undefined}
                                    maxDate={selectedSemester ? toYMD(selectedSemester.end_date) : undefined}
                                />
                                <Button
                                    variant="secondary"
                                    onClick={() => setGridDate(todayString())}
                                    className="h-8"
                                >
                                    Hôm nay
                                </Button>
                                <div className="ml-auto flex items-center gap-4">
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4 transition-colors"
                                            checked={examSchedules.length > 0 && selectedKeys.length === examSchedules.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedKeys(examSchedules.map((s) => s.id));
                                                } else {
                                                    setSelectedKeys([]);
                                                }
                                            }}
                                        />
                                        Chọn tất cả
                                    </label>
                                    {selectedKeys.length > 0 && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            leftIcon="trash"
                                            loading={bulkDeleting}
                                            onClick={() => setBulkDeleteConfirm(true)}
                                        >
                                            Xóa {selectedKeys.length} mục
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Badge hiển thị khoảng ngày học kì */}
                        {selectedSemester && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50/50 border-b border-blue-100 text-xs text-blue-700">
                                <i className="ti ti-calendar-event text-sm" />
                                <span className="font-medium">Học kì {selectedSemester.semester_number} - {selectedSemester.academic_year}</span>
                                <span className="text-blue-400">:</span>
                                <span>
                                    {new Date(selectedSemester.start_date).toLocaleDateString("vi-VN")}
                                    {"-"}
                                    {new Date(selectedSemester.end_date).toLocaleDateString("vi-VN")}
                                </span>
                            </div>
                        )}

                        {/* Thống kê nhanh */}
                        {!loading && examSchedules.length > 0 && (
                            <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-100 text-xs text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <i className="ti ti-chart-bar text-slate-400" />
                                    <span className="font-medium text-slate-700">{dailyStats.totalSchedules}</span> ca thi
                                </div>
                                <div className="w-px h-3 bg-slate-200" />
                                <div className="flex items-center gap-1.5">
                                    <i className="ti ti-door text-slate-400" />
                                    <span className="font-medium text-slate-700">{dailyStats.totalRooms}</span> phòng
                                </div>
                                <div className="w-px h-3 bg-slate-200" />
                                <div className="flex items-center gap-1.5">
                                    <i className="ti ti-users text-slate-400" />
                                    <span className="font-medium text-slate-700">{dailyStats.totalStudents}</span> thí sinh
                                </div>
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
                            selectable={true}
                            selectedKeys={selectedKeys}
                            onSelectChange={setSelectedKeys}
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
            <SemesterManagerModal
                open={semesterManagerOpen}
                onClose={() => setSemesterManagerOpen(false)}
                onSuccess={fetchSemesters}
            />
            <Modal
                open={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                title="Chọn học kì để xuất Excel"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setExportModalOpen(false)} disabled={isExporting}>Hủy</Button>
                        <Button variant="primary" onClick={handleExportPeriod} disabled={!exportSelectedSemesterId || isExporting} loading={isExporting}>Xuất dữ liệu</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Học kì <span className="text-red-500">*</span></label>
                        <select
                            value={exportSelectedSemesterId}
                            onChange={(e) => setExportSelectedSemesterId(e.target.value)}
                            disabled={isExporting}
                            className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-60 disabled:bg-slate-100"
                        >
                            <option value="" disabled>-- Chọn học kì --</option>
                            {semesters.map((p) => (
                                <option key={p.id} value={p.id}>Học kì {p.semester_number} - {p.academic_year}</option>
                            ))}
                        </select>
                    </div>
                    <p className="text-xs text-slate-500">
                        Hệ thống sẽ tổng hợp toàn bộ ca thi của học kì được chọn và xuất ra một file Excel, mỗi ca thi là một Sheet.
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
            <Modal
                open={bulkDeleteConfirm}
                onClose={() => setBulkDeleteConfirm(false)}
                title="Xác nhận xóa hàng loạt"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setBulkDeleteConfirm(false)}>Hủy</Button>
                        <Button variant="danger" loading={bulkDeleting} onClick={handleBulkDelete}>Xóa {selectedKeys.length} mục</Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600">
                    Bạn có chắc chắn muốn xóa <span className="font-semibold text-slate-900">{selectedKeys.length}</span> lịch thi đã chọn không? Hành động này không thể hoàn tác.
                </p>
            </Modal>
        </div>
    );
}