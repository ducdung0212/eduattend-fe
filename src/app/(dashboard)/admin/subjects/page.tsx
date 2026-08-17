"use client"
import { Column, DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { SearchBar } from "@/components/shared/SearchBar";
import { Button } from "@/components/ui/Button";
import { usePagination } from "@/hooks/usePagination";
import api from "@/lib/api";
import { PaginationMeta, Subject } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { SubjectFormModal } from "./_components/SubjectFormModal";
import { Modal } from "@/components/ui/Modal";
import { SubjectImportModal } from "./_components/SubjectImportModal";

const LIMIT = 10;

export default function SubjectManagementPage() {
    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [semesterFilter, setSemesterFilter] = useState<string>("");

    const { page, setPage, reset: resetPage } = usePagination(meta?.totalPages ?? 1);

    const fetchSubjects = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/subjects", {
                params: {
                    page,
                    limit: LIMIT,
                    search: search || undefined,
                    semester: semesterFilter !== "" ? (semesterFilter === "null" ? "null" : Number(semesterFilter)) : undefined
                }
            });
            setSubjects(res.data?.data ?? []);
            setMeta(res.data?.meta ?? null);
        } catch (e) {
            console.error("Lỗi khi tải danh sách môn học:", e);
            toast.error("Không thể tải danh sách môn học");
        } finally {
            setLoading(false);
        }
    }, [page, search, semesterFilter]);

    useEffect(() => {
        const t = setTimeout(fetchSubjects, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchSubjects, search]);

    const handleOpenModal = useCallback((s?: Subject) => {
        setEditingSubject(s || null);
        setModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setModalOpen(false);
    }, [])

    const handleSearch = (v: string) => {
        setSearch(v);
        resetPage();
    }

    // --- State Bulk Delete ---
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

    const handleBulkDelete = async () => {
        if (selectedKeys.length === 0) return;
        setBulkDeleteModalOpen(false);

        setBulkDeleting(true);
        try {
            const res = await api.post("/subjects/bulk-delete", { ids: selectedKeys });
            const { success, failed, errors } = res.data.data;
            if (failed > 0) {
                toast.error(`Xóa thành công ${success}, thất bại ${failed}`);
                console.error("Bulk delete errors:", errors);
            } else {
                toast.success(`Đã xóa thành công ${success} môn học`);
            }
            setSelectedKeys([]);
            fetchSubjects();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Lỗi khi xóa nhiều môn học");
        } finally {
            setBulkDeleting(false);
        }
    };

    const confirmDelete = async () => {
        if (!subjectToDelete) return;
        setDeleting(true);
        try {
            await api.delete(`/subjects/${subjectToDelete.subject_code}`);
            toast.success("Xóa môn học thành công");
            fetchSubjects();
            setSubjectToDelete(null);
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setDeleting(false);
        }
    }

    const columns: Column<Subject>[] = useMemo(() => [
        {
            key: "subject_code",
            label: "Mã môn học",
            render: (s) => (
                <span className="font-semibold text-slate-900">{s.subject_code}</span>
            )
        },
        {
            key: "name",
            label: "Tên môn học",
            render: (s) => (
                <span className="text-slate-700">{s.name}</span>
            )
        },
        {
            key: "semester",
            label: "Học kì",
            render: (s) => (
                <span className="text-slate-700">
                    {s.semester ? `Học kì ${s.semester}` : <span className="text-slate-400">Chưa quy định</span>}
                </span>
            )
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
                    <Button size="sm" variant="danger" leftIcon="trash" onClick={() => setSubjectToDelete(s)}>
                        Xóa
                    </Button>
                </div>
            )
        },
    ], [handleOpenModal]);

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-medium text-slate-900 tracking-tight">
                        Quản lý môn học
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Tổng quan và quản lý danh mục môn học trong hệ thống
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" leftIcon="upload" onClick={() => setImportModalOpen(true)}>
                        Import Excel
                    </Button>
                    <Button variant="primary" leftIcon="plus" onClick={() => handleOpenModal()}>
                        Thêm môn học
                    </Button>
                </div>
            </div>
            <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
                    <SearchBar
                        value={search}
                        onChange={handleSearch}
                        placeholder="Tìm theo mã môn học hoặc tên môn học..."
                        className="flex-1 min-w-48"
                    />
                    <select
                        value={semesterFilter}
                        onChange={(e) => {
                            setSemesterFilter(e.target.value);
                            resetPage();
                        }}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                    >
                        <option value="">Tất cả học kì</option>
                        <option value="1">Học kì 1</option>
                        <option value="2">Học kì 2</option>
                        <option value="null">Chưa quy định</option>
                    </select>
                    {selectedKeys.length > 0 && (
                        <div className="ml-auto">
                            <Button variant="danger" size="sm" leftIcon="trash" onClick={() => setBulkDeleteModalOpen(true)} loading={bulkDeleting}>
                                Xóa {selectedKeys.length} mục
                            </Button>
                        </div>
                    )}
                </div>
                <DataTable<Subject>
                    columns={columns}
                    data={subjects}
                    loading={loading}
                    rowKey={(s) => s.subject_code}
                    skeletonRows={LIMIT}
                    emptyText="Không tìm thấy môn học nào"
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

            <SubjectFormModal
                open={modalOpen}
                onClose={handleCloseModal}
                subject={editingSubject}
                onSuccess={fetchSubjects}
            />
            <SubjectImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={fetchSubjects}
            />

            <Modal
                open={!!subjectToDelete}
                onClose={() => setSubjectToDelete(null)}
                title="Xác nhận xóa"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setSubjectToDelete(null)}>
                            Hủy
                        </Button>
                        <Button variant="danger" loading={deleting} onClick={confirmDelete}>
                            Xóa
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600">
                    Bạn có chắc chắn muốn xóa môn học <span className="font-semibold text-slate-900">{subjectToDelete?.name}</span> không? Hành động này không thể hoàn tác.
                </p>
            </Modal>

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
                    Bạn có chắc chắn muốn xóa <span className="font-semibold text-slate-900">{selectedKeys.length}</span> môn học đã chọn không? Hành động này không thể hoàn tác.
                </p>
            </Modal>
        </div>
    )

}