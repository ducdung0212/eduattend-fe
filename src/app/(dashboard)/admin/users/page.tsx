"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import { User, PaginationMeta } from "@/types";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { SearchBar } from "@/components/shared/SearchBar";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { usePagination } from "@/hooks/usePagination";
import { getInitials } from "@/lib/utils";
import { UserFormModal } from "./_components/UserFormModal";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { IconBook, IconPresentation, IconShield, IconUser } from "@tabler/icons-react";

// ── Types ──────────────────────────────────────────────────────
interface Stats {
  total: number;
  admin: number;
  lecturer: number;
  student: number;
}

type RoleFilter = "" | "admin" | "lecturer" | "student";

// ── Constants ──────────────────────────────────────────────────
const ROLE_BADGE_VARIANT: Record<string, "danger" | "info" | "success"> = {
  admin: "danger",
  lecturer: "info",
  student: "success",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  lecturer: "Giảng viên",
  student: "Sinh viên",
};

const ROLE_AVATAR_CLASS: Record<string, string> = {
  admin: "bg-red-50 text-red-700",
  lecturer: "bg-blue-50 text-blue-700",
  student: "bg-green-50 text-green-700",
};

const TABS: { label: string; value: RoleFilter }[] = [
  { label: "Tất cả", value: "" },
  { label: "Admin", value: "admin" },
  { label: "Giảng viên", value: "lecturer" },
  { label: "Sinh viên", value: "student" },
];

const LIMIT = 10;

// ── Table columns ──────────────────────────────────────────────
// (Removed global columns - using the one inside the component to support actions)

// ── Page component ─────────────────────────────────────────────
export default function UserManagementPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenModal = useCallback((u?: User) => {
    setEditingUser(u || null);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${userToDelete.id}`);
      toast.success("Xóa người dùng thành công");
      fetchUsers();
      fetchStats();
      setUserToDelete(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<User>[] = useMemo(() => [
    {
      key: "name",
      label: "Người dùng",
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${ROLE_AVATAR_CLASS[u.role] || ""}`}>
            {getInitials(u.name)}
          </div>
          <div>
            <div className="font-medium text-slate-900">{u.name}</div>
            <div className="text-xs text-slate-400 mt-0.5">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Vai trò",
      render: (u) => (
        <Badge variant={ROLE_BADGE_VARIANT[u.role] as any}>
          {ROLE_LABELS[u.role]}
        </Badge>
      ),
    },
    {
      key: "created_at",
      label: "Ngày tạo",
      render: (u) =>
        new Date(u.created_at).toLocaleDateString("vi-VN", {
          day: "2-digit", month: "2-digit", year: "numeric",
        }),
    },
    {
      key: "actions",
      label: "Thao tác",
      align: "right",
      render: (u) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" leftIcon="edit" onClick={() => handleOpenModal(u)}>
            Sửa
          </Button>
          <Button size="sm" variant="danger" leftIcon="trash" onClick={() => setUserToDelete(u)}>
            Xóa
          </Button>
        </div>
      ),
    },
  ], [handleOpenModal]);

  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("");

  // Dùng usePagination hook từ hooks/usePagination.ts
  const { page, setPage, reset: resetPage } = usePagination(meta?.totalPages ?? 1);

  // ── Fetch stats ───────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const [all, admin, lecturer, student] = await Promise.all([
        api.get("/users", { params: { limit: 1 } }),
        api.get("/users", { params: { role: "admin", limit: 1 } }),
        api.get("/users", { params: { role: "lecturer", limit: 1 } }),
        api.get("/users", { params: { role: "student", limit: 1 } }),
      ]);
      setStats({
        total: all.data?.meta?.total ?? 0,
        admin: admin.data?.meta?.total ?? 0,
        lecturer: lecturer.data?.meta?.total ?? 0,
        student: student.data?.meta?.total ?? 0,
      });
    } catch { /* bỏ qua */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Fetch danh sách users (debounce search 400ms) ─────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/users", {
        params: {
          page,
          limit: LIMIT,
          search: search || undefined,
          role: role || undefined,
        },
      });
      setUsers(res.data?.data ?? []);
      setMeta(res.data?.meta ?? null);
    } catch (e) {
      console.error("Lỗi khi tải danh sách user:", e);
    } finally {
      setLoading(false);
    }
  }, [page, search, role]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchUsers, search]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleSearch = (v: string) => { setSearch(v); resetPage(); };
  const handleRole = (r: RoleFilter) => { setRole(r); resetPage(); };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-medium text-slate-900 tracking-tight">
            Quản lý người dùng
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tổng quan và quản lý tài khoản hệ thống
          </p>
        </div>
        <Button variant="primary" leftIcon="plus" onClick={() => handleOpenModal()}>
          Thêm người dùng
        </Button>
      </div>

      {/* Stats — dùng StatCard từ components/shared/StatCard.tsx */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatCard label="Tổng cộng" value={stats?.total ?? "—"} icon={<IconUser className="w-5 h-5" />} />
        <StatCard label="Admin" value={stats?.admin ?? "—"} icon={<IconShield className="w-5 h-5" />} />
        <StatCard label="Giảng viên" value={stats?.lecturer ?? "—"} icon={<IconPresentation className="w-5 h-5" />} />
        <StatCard label="Sinh viên" value={stats?.student ?? "—"} icon={<IconBook className="w-5 h-5" />} />
      </div>

      {/* Table card */}
      <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
          {/* SearchBar từ components/shared/SearchBar.tsx */}
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Tìm theo tên hoặc email..."
            className="flex-1 min-w-48"
          />

          {/* Filter tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => handleRole(t.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${role === t.value
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* DataTable từ components/shared/DataTable.tsx */}
        <DataTable<User>
          columns={columns}
          data={users}
          loading={loading}
          rowKey={(u) => u.id}
          skeletonRows={LIMIT}
          emptyText="Không tìm thấy người dùng nào."
        />

        {/* Pagination từ components/shared/Pagination.tsx */}
        <Pagination
          page={page}
          totalPages={meta?.totalPages ?? 1}
          total={meta?.total ?? 0}
          limit={LIMIT}
          onPageChange={setPage}
        />
      </div>

      {/* Modal Thêm / Sửa người dùng */}
      <UserFormModal
        open={modalOpen}
        onClose={handleCloseModal}
        user={editingUser}
        onSuccess={() => { fetchUsers(); fetchStats(); }}
      />

      {/* Modal Xác nhận xóa */}
      <Modal
        open={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        title="Xác nhận xóa"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUserToDelete(null)}>
              Hủy
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Xóa
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Bạn có chắc chắn muốn xóa người dùng <span className="font-semibold text-slate-900">{userToDelete?.name}</span> không? Hành động này không thể hoàn tác.
        </p>
      </Modal>
    </div>
  );
}