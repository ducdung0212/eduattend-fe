"use client"

import { Column, DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { SearchBar } from "@/components/shared/SearchBar";
import { Button } from "@/components/ui/Button";
import { usePagination } from "@/hooks/usePagination";
import api from "@/lib/api";
import { Faculty, Lecturer, PaginationMeta } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { LecturerFormModal } from "./_components/LecturerFormModal";
import { LecturerImportModal } from "./_components/LecturerImportModal"; // Import component mới
import { Modal } from "@/components/ui/Modal";
import { fullName } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";

const LIMIT = 10;

export default function LecturerManagementPage() {
    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false); // State quản lý modal import
    const [editingLecturer, setEditingLecturer] = useState<any | null>(null);
    const [lecturerToDelete, setLecturerToDelete] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [lecturers, setLecturers] = useState<Lecturer[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isHasPhoto, setIsHasPhoto] = useState<string>("");

    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [facultyCode, setFacultyCode] = useState("");

    const { page, setPage, reset: resetPage } = usePagination(meta?.totalPages ?? 1);

    const fetchLecturers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/lecturers", {
                params: {
                    page,
                    limit: LIMIT,
                    search: search || undefined,
                    faculty_code: facultyCode || undefined,
                    is_has_photo: isHasPhoto || undefined,
                }
            });
            setLecturers(res.data?.data ?? []);
            setMeta(res.data?.meta ?? null);
        } catch (e) {
            console.error("Lỗi khi tải danh sách giảng viên:", e);
            toast.error("Không thể tải danh sách giảng viên");
        } finally {
            setLoading(false);
        }
    }, [page, search, facultyCode, isHasPhoto])

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

    useEffect(() => {
        const t = setTimeout(fetchLecturers, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchLecturers, search]);

    const handleOpenModal = useCallback((l?: any) => {
        setEditingLecturer(l || null);
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
        resetPage();
    }

    const handlePhotoFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setIsHasPhoto(e.target.value);
        resetPage();
    }

    const confirmDelete = async () => {
        if (!lecturerToDelete) return;
        setDeleting(true);
        try {
            await api.delete(`/lecturers/${lecturerToDelete.lecturer_code}`);
            toast.success("Xóa giảng viên thành công");
            fetchLecturers();
            setLecturerToDelete(null);
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setDeleting(false);
        }
    }

    // ── Bulk Delete ──────────────────────────────────────────────
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

    const handleBulkDelete = async () => {
        if (selectedKeys.length === 0) return;
        setBulkDeleting(true);
        try {
            const res = await api.post("/lecturers/bulk-delete", { ids: selectedKeys });
            const { success, failed, errors } = res.data.data;
            if (failed > 0) {
                toast.error(`Xóa thành công ${success}, thất bại ${failed}`);
                console.error("Bulk delete errors:", errors);
            } else {
                toast.success(`Đã xóa thành công ${success} giảng viên`);
            }
            setSelectedKeys([]);
            setBulkDeleteModalOpen(false);
            fetchLecturers();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Lỗi khi xóa nhiều giảng viên");
        } finally {
            setBulkDeleting(false);
        }
    };

    const columns: Column<any>[] = useMemo(() => [
        {
            key: "lecturer_code",
            label: "Mã giảng viên",
            render: (l) => (
                <span className="font-semibold text-slate-900">{l.lecturer_code}</span>
            ),
        },
        {
            key: "name",
            label: "Họ và tên",
            render: (l) => (
                <span className="text-slate-700">{fullName(l)}</span>
            ),
        },
        {
            key: "email",
            label: "Email",
            render: (l) => (
                <span className="text-slate-700">{l.email}</span>
            ),
        },
        {
            key: "phone",
            label: "Phone",
            render: (l) => (
                <span className="text-slate-700">{l.phone || "-"}</span>
            ),
        },
        {
            key: "faculty",
            label: "Khoa quản lý",
            render: (l) => (
                <span className="text-slate-700">{l.faculty?.name}</span>
            ),
        },
        {
            key: "account",
            label: "Tài khoản",
            render: (l) => (
                <div className="flex items-center">
                    {l.user ? (
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
            render: (l) => (
                <div className="flex items-center">
                    {l.photos && l.photos.length > 0 ? (
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
            render: (l) => (
                <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" leftIcon="edit" onClick={() => handleOpenModal(l)}>
                        Sửa
                    </Button>
                    <Button size="sm" variant="danger" leftIcon="trash" onClick={() => setLecturerToDelete(l)}>
                        Xóa
                    </Button>
                </div>
            ),
        },
    ], [handleOpenModal]);

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-medium text-slate-900 tracking-tight">
                        Quản lý giảng viên
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Tổng quan và quản lý danh mục giảng viên trong hệ thống
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" leftIcon="upload" onClick={() => setImportModalOpen(true)}>
                        Import Excel
                    </Button>
                    <Button variant="primary" leftIcon="plus" onClick={() => handleOpenModal()}>
                        Thêm giảng viên
                    </Button>
                </div>
            </div>

            <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap bg-slate-50/50">
                    <SearchBar
                        value={search}
                        onChange={handleSearch}
                        placeholder="Tìm theo mã giảng viên, tên, email, số điện thoại..."
                        className="flex-1 min-w-48"
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

                    {/* Filter Hình ảnh */}
                    <select
                        value={isHasPhoto}
                        onChange={handlePhotoFilterChange}
                        className="h-9 px-3 text-sm text-slate-900 rounded-lg border border-slate-200 bg-white outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 min-w-[150px]"
                    >
                        <option value="">-- Trạng thái ảnh --</option>
                        <option value="true">Đã có ảnh</option>
                        <option value="false">Chưa có ảnh</option>
                    </select>

                    {selectedKeys.length > 0 && (
                        <div className="flex items-center ml-auto">
                            <Button
                                variant="danger"
                                size="sm"
                                leftIcon="trash"
                                onClick={() => setBulkDeleteModalOpen(true)}
                            >
                                Xóa {selectedKeys.length} mục
                            </Button>
                        </div>
                    )}
                </div>
                <DataTable<any>
                    columns={columns}
                    data={lecturers}
                    loading={loading}
                    rowKey={(l) => l.lecturer_code}
                    skeletonRows={LIMIT}
                    emptyText="Không tìm thấy giảng viên nào."
                    selectable
                    selectedRowKeys={selectedKeys}
                    onSelectChange={setSelectedKeys}
                />

                <Pagination
                    page={page}
                    totalPages={meta?.totalPages ?? 1}
                    total={meta?.total ?? 0}
                    limit={LIMIT}
                    onPageChange={setPage}
                />
            </div>

            <LecturerFormModal
                open={modalOpen}
                onClose={handleCloseModal}
                lecturer={editingLecturer}
                onSuccess={fetchLecturers}
            />

            <LecturerImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={fetchLecturers}
            />

            <Modal
                open={!!lecturerToDelete}
                onClose={() => setLecturerToDelete(null)}
                title="Xác nhận xóa"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setLecturerToDelete(null)}>
                            Hủy
                        </Button>
                        <Button variant="danger" loading={deleting} onClick={confirmDelete}>
                            Xóa
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600">
                    Bạn có chắc chắn muốn xóa giảng viên <span className="font-semibold text-slate-900">{lecturerToDelete ? fullName(lecturerToDelete) : ''}</span> không? Hành động này không thể hoàn tác.
                </p>
            </Modal>

            {/* Modal Bulk Delete Giảng viên */}
            <Modal
                open={bulkDeleteModalOpen}
                onClose={() => setBulkDeleteModalOpen(false)}
                title="Xác nhận xóa hàng loạt"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setBulkDeleteModalOpen(false)}>
                            Hủy
                        </Button>
                        <Button variant="danger" loading={bulkDeleting} onClick={handleBulkDelete}>
                            Xóa {selectedKeys.length} mục
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600">
                    Bạn có chắc chắn muốn xóa <span className="font-semibold text-slate-900">{selectedKeys.length}</span> giảng viên đã chọn không? Hành động này không thể hoàn tác.
                </p>
            </Modal>
        </div>
    )
}