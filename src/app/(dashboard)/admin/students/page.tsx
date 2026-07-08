"use client"

import { Column, DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { SearchBar } from "@/components/shared/SearchBar";
import { Button } from "@/components/ui/Button";
import { usePagination } from "@/hooks/usePagination";
import api from "@/lib/api";
import { PaginationMeta, Faculty, Class } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { StudentFormModal } from "./_components/StudentFormModal";
import { StudentImportModal } from "./_components/StudentImportModal";
import { Modal } from "@/components/ui/Modal";
import { fullName } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";

const LIMIT = 10;

export default function StudentManagementPage() {
    // --- State Modals ---
    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<any | null>(null);
    const [studentToDelete, setStudentToDelete] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    // --- State Data ---
    const [students, setStudents] = useState<any[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);
    
    // --- State Filters ---
    const [search, setSearch] = useState("");
    const [facultyCode, setFacultyCode] = useState("");
    const [classCode, setClassCode] = useState("");
    
    // --- State Dropdowns ---
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);

    const { page, setPage, reset: resetPage } = usePagination(meta?.totalPages ?? 1);

    // 1. Fetch danh sách Khoa cho bộ lọc
    useEffect(() => {
        const fetchFaculties = async () => {
            try {
                const res = await api.get("/faculties");
                setFaculties(res.data?.data || []);
            } catch (error) {
                console.error("Lỗi khi tải danh sách khoa:", error);
            }
        };
        fetchFaculties();
    }, []);

    // 2. Fetch danh sách Lớp khi Khoa thay đổi
    useEffect(() => {
        if (!facultyCode) {
            setClasses([]);
            return;
        }
        const fetchClasses = async () => {
            try {
                const res = await api.get("/classes", {
                    params: { faculty_code: facultyCode }
                });
                setClasses(res.data?.data || []);
            } catch (error) {
                console.error("Lỗi khi tải danh sách lớp:", error);
            }
        };
        fetchClasses();
    }, [facultyCode]);

    // 3. Fetch danh sách Sinh viên
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/students", {
                params: {
                    page,
                    limit: LIMIT,
                    search: search || undefined,
                    faculty_code: facultyCode || undefined,
                    class_code: classCode || undefined,
                }
            });
            setStudents(res.data?.data ?? []);
            setMeta(res.data?.meta ?? null);
        } catch (e) {
            console.error("Lỗi khi tải danh sách sinh viên:", e);
            toast.error("Không thể tải danh sách sinh viên");
        } finally {
            setLoading(false);
        }
    }, [page, search, facultyCode, classCode]);

    // Debounce cho ô tìm kiếm
    useEffect(() => {
        const t = setTimeout(fetchStudents, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchStudents, search]);

    // --- Handlers ---
    const handleOpenModal = useCallback((s?: any) => {
        setEditingStudent(s || null);
        setModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setModalOpen(false);
    }, []);

    const handleSearch = (v: string) => {
        setSearch(v);
        resetPage();
    }

    const handleFacultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFacultyCode(e.target.value);
        setClassCode(""); // Reset lớp khi đổi khoa
        resetPage();
    }

    const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setClassCode(e.target.value);
        resetPage();
    }

    const confirmDelete = async () => {
        if (!studentToDelete) return;
        setDeleting(true);
        try {
            await api.delete(`/students/${studentToDelete.student_code}`);
            toast.success("Xóa sinh viên thành công");
            fetchStudents();
            setStudentToDelete(null);
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setDeleting(false);
        }
    }

    // --- Columns Cấu hình ---
    const columns: Column<any>[] = useMemo(() => [
        {
            key: "student_code",
            label: "Mã sinh viên",
            render: (s) => (
                <span className="font-semibold text-slate-900">{s.student_code}</span>
            ),
        },
        {
            key: "name",
            label: "Họ và tên",
            render: (s) => (
                <span className="text-slate-700">{fullName(s)}</span>
            ),
        },
        {
            key: "email",
            label: "Email",
            render: (s) => (
                <span className="text-slate-700">{s.email}</span>
            ),
        },
        {
            key: "class",
            label: "Lớp",
            render: (s) => (
                <div className="flex flex-col">
                    <span className="text-slate-700 font-medium">{s.class?.class_code}</span>
                    <span className="text-xs text-slate-500">{s.class?.name}</span>
                </div>
            ),
        },
        {
            key: "account",
            label: "Tài khoản",
            render: (s) => (
                <div className="flex items-center">
                    {s.user ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 border border-green-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-xs text-green-700 font-medium">Đã liên kết</span>
                        </div>
                    ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Chưa có
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: "photo",
            label: "Ảnh khuôn mặt",
            render: (s) => (
                <div className="flex items-center">
                    {s.photos && s.photos.length > 0 ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100">
                            <IconCheck className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs text-emerald-700 font-medium">Đã đăng ký</span>
                        </div>
                    ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Chưa có
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: "actions",
            label: "Thao tác",
            align: "right",
            render: (s) => (
                <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" leftIcon="edit" onClick={() => handleOpenModal(s)}>
                        Sửa
                    </Button>
                    <Button size="sm" variant="danger" leftIcon="trash" onClick={() => setStudentToDelete(s)}>
                        Xóa
                    </Button>
                </div>
            ),
        },
    ], [handleOpenModal]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-medium text-slate-900 tracking-tight">
                        Quản lý sinh viên
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Tổng quan và quản lý danh mục sinh viên trong hệ thống
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" leftIcon="upload" onClick={() => setImportModalOpen(true)}>
                        Import Excel
                    </Button>
                    <Button variant="primary" leftIcon="plus" onClick={() => handleOpenModal()}>
                        Thêm sinh viên
                    </Button>
                </div>
            </div>

            <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
                {/* Bộ lọc (Filters) */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap bg-slate-50/50">
                    <SearchBar
                        value={search}
                        onChange={handleSearch}
                        placeholder="Tìm theo mã SV, tên, email..."
                        className="flex-1 min-w-[200px]"
                    />
                    
                    {/* Filter Khoa */}
                    <select
                        value={facultyCode}
                        onChange={handleFacultyChange}
                        className="h-9 px-3 text-sm text-slate-900 rounded-lg border border-slate-200 bg-white outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 min-w-[180px]"
                    >
                        <option value="">-- Tất cả Khoa --</option>
                        {faculties.map((f) => (
                            <option key={f.faculty_code} value={f.faculty_code}>
                                {f.name}
                            </option>
                        ))}
                    </select>

                    {/* Filter Lớp (chỉ hiện khi đã chọn khoa hoặc disable nếu chưa chọn) */}
                    <select
                        value={classCode}
                        onChange={handleClassChange}
                        disabled={!facultyCode}
                        className="h-9 px-3 text-sm text-slate-900 rounded-lg border border-slate-200 bg-white outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 min-w-[160px] disabled:bg-slate-50 disabled:text-slate-400"
                    >
                        <option value="">-- Tất cả Lớp --</option>
                        {classes.map((c) => (
                            <option key={c.class_code} value={c.class_code}>
                                {c.class_code} - {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Bảng dữ liệu */}
                <DataTable<any>
                    columns={columns}
                    data={students}
                    loading={loading}
                    rowKey={(s) => s.student_code}
                    skeletonRows={LIMIT}
                    emptyText="Không tìm thấy sinh viên nào phù hợp."
                />

                {/* Phân trang */}
                <Pagination
                    page={page}
                    totalPages={meta?.totalPages ?? 1}
                    total={meta?.total ?? 0}
                    limit={LIMIT}
                    onPageChange={setPage}
                />
            </div>

            {/* Modals */}
            <StudentFormModal
                open={modalOpen}
                onClose={handleCloseModal}
                student={editingStudent}
                onSuccess={fetchStudents}
            />

            <StudentImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={fetchStudents}
            />

            <Modal
                open={!!studentToDelete}
                onClose={() => setStudentToDelete(null)}
                title="Xác nhận xóa"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setStudentToDelete(null)}>
                            Hủy
                        </Button>
                        <Button variant="danger" loading={deleting} onClick={confirmDelete}>
                            Xóa
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600">
                    Bạn có chắc chắn muốn xóa sinh viên <span className="font-semibold text-slate-900">{studentToDelete ? fullName(studentToDelete) : ''}</span> không? Hành động này không thể hoàn tác.
                </p>
            </Modal>
        </div>
    )
}