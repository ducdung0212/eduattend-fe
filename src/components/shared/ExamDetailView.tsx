"use client";

import { CheckInCameraView } from "./CheckInCameraView";
import { Pagination } from "@/components/shared/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { DataTable, Column } from "@/components/shared/DataTable";

import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/shared/SearchBar";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { formatTime, formatDateTime, cn, formatDateVN, toYMD } from "@/lib/utils";
import { ExamSchedule, AttendanceRecord, ExamSupervisor, RekognitionResult, AttendanceStatus } from "@/types";
import { useCallback, useEffect, useState, useMemo } from "react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

interface Props {
    schedule: ExamSchedule;
    onBack?: () => void;
    hideAttendanceButton?: boolean;
}

export function ExamDetailView({ schedule, onBack, hideAttendanceButton }: Props) {
    // ── Chi tiết ca thi ──────────────────────────────
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [supervisors, setSupervisors] = useState<ExamSupervisor[]>([]);
    const [loadingRecords, setLoadingRecords] = useState(true);
    const [loadingSupervisors, setLoadingSupervisors] = useState(true);

    // ── Trạng thái sắp xếp tên ───────────────────────
    const [nameSortDir, setNameSortDir] = useState<'asc' | 'desc' | 'none'>('none');

    // ── Search & Filter ─────────────────────────────
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // ── Image Modal ────────────────────────────────
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // ── Camera Modal ────────────────────────────────
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const startStr = formatTime(schedule.start_time);
    const endDate = new Date(new Date(schedule.start_time).getTime() + (schedule.duration ?? 120) * 60000);
    const endStr = formatTime(endDate);

    // Fetch attendance records
    const fetchRecords = useCallback(async () => {
        setLoadingRecords(true);
        try {
            const res = await api.get("/attendance-records", {
                params: { 
                    exam_schedule_id: schedule.id,
                    limit: 200 },
            });
            setRecords(res.data?.data ?? []);
        } catch {
            toast.error("Không thể tải danh sách thí sinh");
        } finally {
            setLoadingRecords(false);
        }
    }, [schedule.id]);

    // Fetch supervisors
    const fetchSupervisors = useCallback(async () => {
        setLoadingSupervisors(true);
        try {
            const res = await api.get("/exam-supervisors", {
                params: { exam_schedule_id: schedule.id, limit: 50 },
            });
            setSupervisors(res.data?.data ?? []);
        } catch {
            toast.error("Không thể tải danh sách giám thị");
        } finally {
            setLoadingSupervisors(false);
        }
    }, [schedule.id]);

    useEffect(() => {
        fetchRecords();
        fetchSupervisors();
    }, [fetchRecords, fetchSupervisors]);


    // Đếm đã điểm danh
    const attendedCount = records.filter((r) => r.attendance_time).length;

    // Sắp xếp: đã điểm danh lên đầu (mới nhất trước), chưa điểm danh xếp theo tên
    const sortedRecords = useMemo(() => {
        return [...records].sort((a, b) => {
            if (nameSortDir === 'none') {
                const aChecked = !!a.attendance_time;
                const bChecked = !!b.attendance_time;

                if (aChecked && bChecked) {
                    return new Date(b.attendance_time!).getTime() - new Date(a.attendance_time!).getTime(); // desc
                }
                if (aChecked) return -1;
                if (bChecked) return 1;

                const nameA = a.student?.first_name || "";
                const nameB = b.student?.first_name || "";
                if (nameA !== nameB) return nameA.localeCompare(nameB);

                const lastA = a.student?.last_name || "";
                const lastB = b.student?.last_name || "";
                return lastA.localeCompare(lastB);
            } else {
                const order = nameSortDir === 'asc' ? 1 : -1;
                const nameA = a.student?.first_name || "";
                const nameB = b.student?.first_name || "";

                if (nameA !== nameB) return nameA.localeCompare(nameB) * order;

                const lastA = a.student?.last_name || "";
                const lastB = b.student?.last_name || "";
                return lastA.localeCompare(lastB) * order;
            }
        });
    }, [records, nameSortDir]);

    // Lọc theo tìm kiếm và trạng thái
    const filteredRecords = useMemo(() => {
        let result = sortedRecords;

        if (statusFilter !== "all") {
            result = result.filter(r => {
                const currentStatus = r.status || (r.attendance_time ? "present" : "absent");
                return currentStatus === statusFilter;
            });
        }

        if (!searchQuery.trim()) return result;
        const q = searchQuery.toLowerCase();
        return result.filter(r => 
            r.student?.student_code?.toLowerCase().includes(q) ||
            r.student?.first_name?.toLowerCase().includes(q) ||
            r.student?.last_name?.toLowerCase().includes(q)
        );
    }, [sortedRecords, searchQuery, statusFilter]);

    // Phân trang
    const totalPages = Math.ceil(filteredRecords.length / 20);
    const { page, limit, setPage } = usePagination(totalPages, { initialLimit: 20 });
    const paginatedRecords = filteredRecords.slice((page - 1) * limit, page * limit);

    // Thay đổi trạng thái điểm danh thủ công
    const handleUpdateStatus = async (record: AttendanceRecord, newStatus: AttendanceStatus) => {
        const isPresentOrLate = newStatus === 'present' || newStatus === 'late';
        const newTime = (isPresentOrLate && !record.attendance_time) ? new Date().toISOString() : (!isPresentOrLate ? null : record.attendance_time);
        
        // Optimistic update: cập nhật state ngay lập tức để giao diện phản hồi nhanh
        setRecords(prev => prev.map(r => r.id === record.id ? { ...r, status: newStatus, attendance_time: newTime as any } : r));

        try {
            await api.patch(`/attendance-records/${record.id}`, {
                status: newStatus,
                attendance_time: newTime,
            });
            toast.success("Đã cập nhật trạng thái");
        } catch (err: any) {
            // Rollback nếu API thất bại
            setRecords(prev => prev.map(r => r.id === record.id ? { ...r, status: record.status, attendance_time: record.attendance_time } : r));
            toast.error("Không thể cập nhật trạng thái");
        }
    };

    // Cập nhật ghi chú
    const handleUpdateNote = async (record: AttendanceRecord, newNote: string) => {
        if (record.note === newNote) return;

        // Optimistic update
        setRecords(prev => prev.map(r => r.id === record.id ? { ...r, note: newNote } : r));

        try {
            await api.patch(`/attendance-records/${record.id}`, {
                note: newNote,
            });
            toast.success("Đã lưu ghi chú");
        } catch (err: any) {
            // Rollback nếu API thất bại
            setRecords(prev => prev.map(r => r.id === record.id ? { ...r, note: record.note } : r));
            toast.error("Không thể lưu ghi chú");
        }
    };

    // Xuất Excel
    const exportToExcel = () => {
        // Sắp xếp ưu tiên: Lớp -> Tên -> Họ
        const exportRecords = [...records].sort((a, b) => {
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

        exportRecords.forEach((r) => {
            const currentStatus = r.status || (r.attendance_time ? "present" : "absent");
            if (currentStatus === "present") present++;
            else if (currentStatus === "late") late++;
            else if (currentStatus === "excused") excused++;
            else absent++;
        });

        const totalStudents = exportRecords.length;
        const totalPresent = present + late; // Đi muộn tính vào có mặt

        const aoaData: any[][] = [];
        // Thông tin ca thi ở đầu sheet
        aoaData.push(["THÔNG TIN CA THI"]);
        aoaData.push(["Môn thi:", schedule.subject?.name || "", "", "Mã môn:", schedule.subject?.subject_code || ""]);
        aoaData.push(["Phòng thi:", schedule.room?.name || schedule.room?.room_code || "", "", "Ngày thi:", schedule.start_time ? formatDateVN(toYMD(schedule.start_time)) : ""]);
        aoaData.push(["Giờ bắt đầu:", schedule.start_time ? formatTime(schedule.start_time) : "", "", "Thời lượng:", `${schedule.duration || 120} phút`]);
        aoaData.push(["Nhóm/Ca thi:", schedule.group || "", "", "Giám thị:", (supervisors || []).map(s => `${s.lecturer?.last_name || ""} ${s.lecturer?.first_name || ""}`.trim()).join(", ") || "Chưa phân công"]);
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
        exportRecords.forEach((r, index) => {
            const currentStatus = r.status || (r.attendance_time ? "present" : "absent");
            aoaData.push([
                index + 1,
                r.student?.student_code || "",
                `${r.student?.last_name || ""} ${r.student?.first_name || ""}`.trim(),
                r.student?.class?.name || r.student?.class?.class_code || "",
                currentStatus === "present" ? "Có mặt" : currentStatus === "late" ? "Đi muộn" : currentStatus === "excused" ? "Có phép" : "Vắng mặt",
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

        // Căn chỉnh độ rộng cột
        ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 25 }, { wch: 20 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "DanhSachDiemDanh");

        XLSX.writeFile(wb, `DiemDanh_${schedule.subject?.subject_code || "CaThi"}_Nhom${schedule.group || ""}.xlsx`);
    };

    // --- Định nghĩa Cột cho DataTable ---
    const columns: Column<AttendanceRecord>[] = [
        {
            key: 'index',
            label: '#',
            className: 'w-10 text-slate-400 text-xs',
            render: (_, idx) => (page - 1) * limit + idx + 1,
        },
        {
            key: 'student_code',
            label: 'Mã SV',
            className: 'font-medium text-slate-900',
            render: (r) => r.student?.student_code || '—',
        },
        {
            key: 'photo',
            label: 'Ảnh gốc',
            align: 'center',
            render: (r) => {
                const hasPhoto = r.student?.photos && r.student.photos.length > 0;
                return hasPhoto ? (
                    <button
                        onClick={() => setSelectedImage(r.student.photos![0].image_url)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Xem ảnh gốc"
                    >
                        <i className="ti ti-photo text-sm" />
                    </button>
                ) : (
                    <span className="text-slate-300 text-xs">—</span>
                );
            },
        },
        {
            key: 'name',
            label: (
                <div 
                    className="flex items-center gap-1 cursor-pointer hover:text-slate-600 transition-colors"
                    onClick={() => setNameSortDir(prev => prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none')}
                >
                    Họ tên
                    {nameSortDir !== 'none' && <i className={`ti ti-sort-${nameSortDir === 'asc' ? 'ascending' : 'descending'} text-slate-400`} />}
                    {nameSortDir === 'none' && <i className={`ti ti-arrows-sort text-slate-300`} />}
                </div>
            ),
            render: (r) => <span className="text-slate-700">{`${r.student?.last_name || ''} ${r.student?.first_name || ''}`}</span>,
        },
        {
            key: 'class',
            label: 'Lớp',
            className: 'text-slate-500 text-xs',
            render: (r) => r.student?.class?.name || r.student?.class?.class_code || '—',
        },
        {
            key: 'status',
            label: 'Trạng thái',
            align: 'center',
            render: (r) => {
                const currentStatus = r.status || (r.attendance_time ? "present" : "absent");
                return (
                    <select
                        value={currentStatus}
                        onChange={(e) => handleUpdateStatus(r, e.target.value as AttendanceStatus)}
                        className={cn(
                            "text-[11px] font-semibold px-2 py-0.5 rounded-full outline-none border transition-colors cursor-pointer text-center",
                            currentStatus === 'present' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            currentStatus === 'late' && "bg-amber-50 text-amber-700 border-amber-200",
                            currentStatus === 'excused' && "bg-blue-50 text-blue-700 border-blue-200",
                            currentStatus === 'absent' && "bg-slate-50 text-slate-600 border-slate-200"
                        )}
                    >
                        <option value="present">Có mặt</option>
                        <option value="absent">Vắng mặt</option>
                        <option value="late">Đi muộn</option>
                        <option value="excused">Có phép</option>
                    </select>
                );
            },
        },
        {
            key: 'note',
            label: 'Ghi chú',
            render: (r) => (
                <input
                    type="text"
                    defaultValue={r.note || ""}
                    onBlur={(e) => handleUpdateNote(r, e.target.value)}
                    placeholder="Thêm ghi chú..."
                    className="w-full min-w-[120px] text-xs px-2 py-1.5 bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 focus:bg-white rounded transition-colors outline-none"
                />
            ),
        },
        {
            key: 'time',
            label: 'Thời gian',
            align: 'right',
            className: 'text-xs text-slate-400',
            render: (r) => r.attendance_time ? formatDateTime(r.attendance_time) : "—",
        },
    ];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                        aria-label="Quay lại"
                    >
                        <i className="ti ti-arrow-left text-lg" />
                    </button>
                )}
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Chi tiết ca thi</h2>
                    <p className="text-xs text-slate-500">Thông tin chi tiết và danh sách thí sinh</p>
                </div>
            </div>

            {/* Thông tin ca thi & Giám thị */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">
                            {schedule.subject?.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-white/70 text-blue-700 border border-blue-200/50">
                                {schedule.subject?.subject_code}
                            </span>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs font-medium text-slate-700">Nhóm {schedule.group}</span>
                        </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 self-start">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        Đang thi
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <InfoBadge icon="clock" label="Thời gian" value={`${startStr} – ${endStr}`} />
                    <InfoBadge icon="door" label="Phòng thi" value={schedule.room?.name || "—"} />
                    <InfoBadge icon="hourglass" label="Thời lượng" value={`${schedule.duration} phút`} />
                    <InfoBadge icon="users" label="Thí sinh" value={`${records.length}`} />
                </div>

                {schedule.exam_period && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-blue-700">
                        <i className="ti ti-calendar-event text-sm" />
                        <span className="font-medium">{schedule.exam_period.name}</span>
                    </div>
                )}
                
                {/* Giám thị tích hợp */}
                <div className="pt-4 border-t border-blue-200/50 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                        <i className="ti ti-user-check text-blue-600" />
                        <h4 className="text-sm font-semibold text-slate-900">Giám thị coi thi</h4>
                        <span className="text-xs text-slate-500 ml-auto">
                            {loadingSupervisors ? "Đang tải..." : `${supervisors.length} giám thị`}
                        </span>
                    </div>
                    {loadingSupervisors ? (
                        <div className="text-sm text-slate-500">Đang tải...</div>
                    ) : supervisors.length === 0 ? (
                        <div className="text-sm text-slate-500">Chưa có giám thị nào</div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {supervisors.map((s) => (
                                <div
                                    key={s.id}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 border border-blue-100/50"
                                >
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                        <i className="ti ti-user text-blue-600 text-xs" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium text-slate-800">
                                            {s.lecturer?.last_name} {s.lecturer?.first_name}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Nút bật camera */}
            {!hideAttendanceButton && (
                <div className="flex justify-center py-2">
                    <Button
                        variant="primary"
                        size="lg"
                        leftIcon="camera"
                        onClick={() => setIsCameraOpen(true)}
                        className="px-8 shadow-md hover:shadow-lg transition-all"
                    >
                        Bật Camera Điểm Danh
                    </Button>
                </div>
            )}

            {/* Danh sách thí sinh */}
            <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 flex-wrap">
                    <i className="ti ti-list-check text-emerald-600" />
                    <h4 className="text-sm font-semibold text-slate-900">Danh sách thí sinh</h4>
                    <div className="ml-4 mr-auto w-64 max-w-full">
                        <SearchBar
                            placeholder="Tìm kiếm mã, tên SV..."
                            value={searchQuery}
                            onChange={(val) => setSearchQuery(val)}
                            className="!h-8 text-xs"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-6 text-[11px] rounded-md border border-slate-200 px-2 outline-none bg-white font-medium text-slate-600"
                        >
                            <option value="all">Tất cả TT</option>
                            <option value="present">Có mặt</option>
                            <option value="absent">Vắng mặt</option>
                            <option value="late">Đi muộn</option>
                            <option value="excused">Có phép</option>
                        </select>
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            leftIcon="file-spreadsheet"
                            onClick={exportToExcel}
                            disabled={records.length === 0}
                            className="h-6 text-[11px] font-medium px-2 py-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                        >
                            Xuất Excel
                        </Button>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {attendedCount} đã điểm danh
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {records.length - attendedCount} chưa
                        </span>
                    </div>
                </div>

                <div className="border-b border-slate-100 max-h-[400px] overflow-y-auto relative">
                    <DataTable
                        columns={columns}
                        data={paginatedRecords}
                        loading={loadingRecords}
                        rowKey={(r) => r.id}
                        emptyText={searchQuery ? "Không tìm thấy kết quả nào." : "Chưa có thí sinh nào trong ca thi này"}
                    />
                </div>

                {/* Phân trang */}
                <Pagination
                    page={page}
                    limit={limit}
                    total={sortedRecords.length}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />
            </div>

            {/* Check-in Camera Modal */}
            <CheckInCameraView
                open={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                schedule={schedule}
                onSuccess={fetchRecords}
            />

            {/* Image Modal */}
            <Modal
                open={!!selectedImage}
                onClose={() => setSelectedImage(null)}
                title="Ảnh gốc sinh viên"
                size="sm"
            >
                <div className="flex justify-center p-4">
                    {selectedImage && (
                        <img 
                            src={selectedImage} 
                            alt="Student photo" 
                            className="max-w-full max-h-[60vh] rounded-lg shadow-sm object-contain"
                        />
                    )}
                </div>
            </Modal>
        </div>
    );
}

// ── Info Badge ─────────────────────────────────────────────
function InfoBadge({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2 border border-blue-100/50">
            <i className={`ti ti-${icon} text-blue-500 text-sm`} />
            <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{label}</div>
                <div className="text-sm font-semibold text-slate-800">{value}</div>
            </div>
        </div>
    );
}
