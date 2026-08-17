"use client"
import { Column, DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { SearchBar } from "@/components/shared/SearchBar";
import { Button } from "@/components/ui/Button";
import { usePagination } from "@/hooks/usePagination";
import api from "@/lib/api";
import { PaginationMeta, Class, Faculty } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ClassFormModal } from "./_components/ClassFormModal";
import { Modal } from "@/components/ui/Modal";
import { ClassImportModal } from "./_components/ClassImportModal";

const LIMIT = 10;

export default function ClassManagementPage() {
    const [modalOpen, setModalOpen] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [classToDelete, setClassToDelete] = useState<Class | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [classes, setClasses] = useState<Class[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [facultyCode,setFacultyCode]=useState("");

    const [faculties,setFaculties]=useState<Faculty[]>([]);

    const { page, setPage, reset: resetPage } = usePagination(meta?.totalPages ?? 1);

    useEffect(()=>{
        const fetchFaculties=async ()=>{
            try{
                const res =await api.get("/faculties");
                setFaculties(res.data?.data||[]);
            }catch(e){
                console.error("Error fetching faculties:",e);
            }
        }
        fetchFaculties();
    },[])

    const fetchClasses = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/classes", {
                params: {
                    page,
                    limit: LIMIT,
                    search: search || undefined,
                    faculty_code: facultyCode || undefined,
                }
            });
            setClasses(res.data?.data ?? []);
            setMeta(res.data?.meta ?? null);
        } catch (e) {
            console.error("Lỗi khi tải danh sách lớp:", e);
            toast.error("Không thể tải danh sách lớp");
        } finally {
            setLoading(false);
        }
    }, [page, search, facultyCode]);

    useEffect(() => {
        const t = setTimeout(fetchClasses, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchClasses, search]);

    const handleOpenModal = useCallback((c?: Class) => {
        setEditingClass(c || null);
        setModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setModalOpen(false);
    }, [])

    const handleSearch = (v: string) => {
        setSearch(v);
        resetPage();
    }

    const handleFacultyChange=(e:React.ChangeEvent<HTMLSelectElement>)=>{
        setFacultyCode(e.target.value);
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
            const res = await api.post("/classes/bulk-delete", { ids: selectedKeys });
            const { success, failed, errors } = res.data.data;
            if (failed > 0) {
                toast.error(`Xóa thành công ${success}, thất bại ${failed}`);
                console.error("Bulk delete errors:", errors);
            } else {
                toast.success(`Đã xóa thành công ${success} lớp`);
            }
            setSelectedKeys([]);
            fetchClasses();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Lỗi khi xóa nhiều lớp");
        } finally {
            setBulkDeleting(false);
        }
    };

    const confirmDelete = async () => {
        if (!classToDelete) return;
        setDeleting(true);
        try {
            await api.delete(`/classes/${classToDelete.class_code}`);
            toast.success("Xóa lớp thành công");
            fetchClasses();
            setClassToDelete(null);
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setDeleting(false);
        }
    }

    const columns: Column<Class>[] = useMemo(() => [
        {
            key: "class_code",
            label: "Mã lớp",
            render: (c) => (
                <span className="font-semibold text-slate-900">{c.class_code}</span>
            ),
        },
        {
            key: "name",
            label: "Tên lớp",
            render: (c) => (
                <span className="text-slate-700">{c.name}</span>
            ),
        },
        {
            key: "faculty",
            label: "Khoa quản lý",
            render: (c) => (
                <span className="text-slate-700">{c.faculty.name}</span>
            ),
        },
        {
            key: "actions",
            label: "Thao tác",
            align: "right",
            render: (c) => (
                <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" leftIcon="edit" onClick={() => handleOpenModal(c)}>
                        Sửa
                    </Button>
                    <Button size="sm" variant="danger" leftIcon="trash" onClick={() => setClassToDelete(c)}>
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
                        Quản lý lớp
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Tổng quan và quản lý danh mục lớp trong hệ thống
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" leftIcon="upload" onClick={() => setImportModalOpen(true)}>
                        Import Excel
                    </Button>
                    <Button variant="primary" leftIcon="plus" onClick={() => handleOpenModal()}>
                        Thêm lớp
                    </Button>
                </div>
            </div>

            <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
                    <SearchBar
                        value={search}
                        onChange={handleSearch}
                        placeholder="Tìm theo mã lớp hoặc tên lớp..."
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
                    {selectedKeys.length > 0 && (
                        <div className="ml-auto">
                            <Button variant="danger" size="sm" leftIcon="trash" onClick={() => setBulkDeleteModalOpen(true)} loading={bulkDeleting}>
                                Xóa {selectedKeys.length} mục
                            </Button>
                        </div>
                    )}
                </div>
                <DataTable<Class>
                    columns={columns}
                    data={classes}
                    loading={loading}
                    rowKey={(c) => c.class_code}
                    skeletonRows={LIMIT}
                    emptyText="Không tìm thấy lớp nào."
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

            <ClassFormModal
                open={modalOpen}
                onClose={handleCloseModal}
                class={editingClass}
                onSuccess={fetchClasses}
            />
            <ClassImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={fetchClasses}
            />

            <Modal
                open={!!classToDelete}
                onClose={() => setClassToDelete(null)}
                title="Xác nhận xóa"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setClassToDelete(null)}>
                            Hủy
                        </Button>
                        <Button variant="danger" loading={deleting} onClick={confirmDelete}>
                            Xóa
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600">
                    Bạn có chắc chắn muốn xóa lớp <span className="font-semibold text-slate-900">{classToDelete?.name}</span> không? Hành động này không thể hoàn tác.
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
                    Bạn có chắc chắn muốn xóa <span className="font-semibold text-slate-900">{selectedKeys.length}</span> lớp đã chọn không? Hành động này không thể hoàn tác.
                </p>
            </Modal>

        </div>
    )
}