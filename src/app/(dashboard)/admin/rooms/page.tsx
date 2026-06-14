"use client";
import { Column, DataTable } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { SearchBar } from "@/components/shared/SearchBar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { usePagination } from "@/hooks/usePagination";
import api from "@/lib/api";
import { Room, PaginationMeta } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RoomFormModal } from "./_components/RoomFormModal";
import { RoomImportModal } from "./_components/RoomImportModal";



const LIMIT = 10;

export default function RoomManagementPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const { page, setPage, reset: resetPage } = usePagination(meta?.totalPages ?? 1);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/rooms", {
        params: {
          page,
          limit: LIMIT,
          search: search || undefined,
        }
      });
      setRooms(res.data?.data ?? []);
      setMeta(res.data?.meta ?? null);
    } catch (e) {
      console.error("Lỗi khi tải danh sách phòng:", e);
      toast.error("Không thể tải danh sách phòng");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(fetchRooms, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchRooms, search]);

  const handleOpenModal = useCallback((f?: Room) => {
    setEditingRoom(f || null);
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
    if (!roomToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/rooms/${roomToDelete.room_code}`);
      toast.success("Xóa phòng thành công");
      fetchRooms();
      setRoomToDelete(null);
    } catch (err: any) {
      const msg = err.respone?.data?.message || err.message;
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Room>[] = useMemo(() => [
    {
      key: "room_code",
      label: "Mã phòng",
      render: (r) => (
        <span className="font-semibold text-slate-900">{r.room_code}</span>
      ),
    },
    {
      key: "name",
      label: "Tên phòng",
      render: (r) => (
        <span className="text-slate-700">{r.name}</span>
      ),
    },
    {
      key: "capacity",
      label: "Sức chứa",
      render: (r) => (
        <span className="text-slate-700">{r.capacity}</span>
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
          <Button size="sm" variant="danger" leftIcon="trash" onClick={() => setRoomToDelete(f)}>
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
            Quản lý Phòng
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tổng quan và quản lý danh mục phòng trong hệ thống
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" leftIcon="upload" onClick={() => setImportModalOpen(true)}>
            Import Excel
          </Button>
          <Button variant="primary" leftIcon="plus" onClick={() => handleOpenModal()}>
            Thêm phòng
          </Button>
        </div>
      </div>

      {/* 5.2. Khối bo mạch chính chứa Thanh tìm kiếm, Bảng và Thanh Phân trang */}
      <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
        {/* Thanh tìm kiếm nằm ở trên cùng của bảng */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Tìm theo mã hoặc tên phòng..."
            className="flex-1 min-w-48"
          />
        </div>

        {/* Cấu trúc hiển thị danh sách dữ liệu */}
        <DataTable<Room>
          columns={columns}
          data={rooms}
          loading={loading}
          rowKey={(f) => f.room_code}
          skeletonRows={LIMIT}
          emptyText="Không tìm thấy phòng nào."
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
      <RoomFormModal
        open={modalOpen}
        onClose={handleCloseModal}
        room={editingRoom}
        onSuccess={fetchRooms}
      />

      <RoomImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={fetchRooms}

      />

      <Modal
        open={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        title="Xác nhận xóa"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRoomToDelete(null)}>
              Hủy
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Xóa
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Bạn có chắc chắn muốn xóa phòng <span className="font-semibold text-slate-900">{roomToDelete?.name}</span> không? Hành động này không thể hoàn tác.
        </p>
      </Modal>
    </div>
  );

}