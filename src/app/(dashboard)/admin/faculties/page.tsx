"use client";
import { Column, DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { SearchBar } from "@/components/shared/SearchBar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { usePagination } from "@/hooks/usePagination";
import api from "@/lib/api";
import { Faculty, PaginationMeta } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FacultyFormModal } from "./_components/FacultyFormModal";


const LIMIT = 10;

export default function FacultyManagementPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [facultyToDelete, setFacultyToDelete] = useState<Faculty | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const { page, setPage, reset: resetPage } = usePagination(meta?.totalPages ?? 1);

  const fetchFaculties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/faculties", {
        params: {
          page,
          limit: LIMIT,
          search: search || undefined,
        }
      });
      setFaculties(res.data?.data ?? []);
      setMeta(res.data?.meta ?? null);
    } catch (e) {
      console.error("Lỗi khi tải danh sách khoa:", e);
      toast.error("Không thể tải danh sách khoa");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(fetchFaculties, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchFaculties, search]);

  const handleOpenModal = useCallback((f?: Faculty) => {
    setEditingFaculty(f || null);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleSearch = (v: string) => {
    setSearch(v);
    resetPage();
  }

  const confirmDelete = async () => {
    if (!facultyToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/faculties/${facultyToDelete.faculty_code}`);
      toast.success("Xóa khoa thành công");
      fetchFaculties();
      setFacultyToDelete(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Faculty>[] = useMemo(() => [
    {
      key: "faculty_code",
      label: "Mã khoa",
      render: (f) => (
        <span className="font-semibold text-slate-900">{f.faculty_code}</span>
      ),
    },
    {
      key: "name",
      label: "Tên khoa",
      render: (f) => (
        <span className="text-slate-700">{f.name}</span>
      ),
    },
    {
      key: "actions",
      label: "Thao tác",
      align: "right",
      render: (f) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" leftIcon="edit" onClick={() => handleOpenModal(f)}>
            Sửa
          </Button>
          <Button size="sm" variant="danger" leftIcon="trash" onClick={() => setFacultyToDelete(f)}>
            Xóa
          </Button>
        </div>
      ),
    },
  ], [handleOpenModal]);
  return (
    <div className="space-y-4">
      {/* 5.1. Khối tiêu đề đầu trang và Nút thêm mới */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-medium text-slate-900 tracking-tight">
            Quản lý Khoa
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tổng quan và quản lý danh mục khoa trong hệ thống
          </p>
        </div>
        <Button variant="primary" leftIcon="plus" onClick={() => handleOpenModal()}>
          Thêm khoa
        </Button>
      </div>

      {/* 5.2. Khối bo mạch chính chứa Thanh tìm kiếm, Bảng và Thanh Phân trang */}
      <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
        {/* Thanh tìm kiếm nằm ở trên cùng của bảng */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Tìm theo mã hoặc tên khoa..."
            className="flex-1 min-w-48"
          />
        </div>

        {/* Cấu trúc hiển thị danh sách dữ liệu */}
        <DataTable<Faculty>
          columns={columns}
          data={faculties}
          loading={loading}
          rowKey={(f) => f.faculty_code}
          skeletonRows={LIMIT}
          emptyText="Không tìm thấy khoa nào."
        />

        {/* Điều hướng chuyển dịch số trang */}
        <Pagination
          page={page}
          totalPages={meta?.totalPages ?? 1}
          total={meta?.total ?? 0}
          limit={LIMIT}
          onPageChange={setPage}
        />
      </div>

      {/* 5.3. Khu vực các Modal ẩn, đợi kích hoạt điều kiện để bật lên */}
      <FacultyFormModal
        open={modalOpen}
        onClose={handleCloseModal}
        faculty={editingFaculty}
        onSuccess={fetchFaculties}
      />

      <Modal
        open={!!facultyToDelete}
        onClose={() => setFacultyToDelete(null)}
        title="Xác nhận xóa"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFacultyToDelete(null)}>
              Hủy
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Xóa
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Bạn có chắc chắn muốn xóa khoa <span className="font-semibold text-slate-900">{facultyToDelete?.name}</span> không? Hành động này không thể hoàn tác.
        </p>
      </Modal>
    </div>
  );

}