'use client';

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/shared/Pagination";
import { SearchBar } from "@/components/shared/SearchBar";
import { usePagination } from "@/hooks/usePagination";
import api from "@/lib/api";
import { toYMD, formatDateShort } from "@/lib/utils";
import { Semester, PaginationMeta } from "@/types";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

interface SemesterManagerModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const LIMIT = 5;

export function SemesterManagerModal({ open, onClose, onSuccess }: SemesterManagerModalProps) {
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState("");

    const { page, setPage, reset: resetPage } = usePagination(meta?.totalPages ?? 1);

    // Form state
    const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
    const [formData, setFormData] = useState({ academic_year: "", semester_number: 1, start_date: "", end_date: "" });
    const [showForm, setShowForm] = useState(false);

    const fetchSemesters = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/semesters", {
                params: {
                    page,
                    limit: LIMIT,
                    search: search || undefined,
                },
            });
            setSemesters(res.data?.data || []);
            setMeta(res.data?.meta ?? null);
        } catch {
            toast.error("Không thể tải danh sách học kì");
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        if (open) {
            fetchSemesters();
        }
    }, [open, fetchSemesters]);

    // Reset khi mở modal
    useEffect(() => {
        if (open) {
            resetForm();
            setSearch("");
            resetPage();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleSearch = (v: string) => {
        setSearch(v);
        resetPage();
    };

    const resetForm = () => {
        setFormData({ academic_year: "", semester_number: 1, start_date: "", end_date: "" });
        setEditingSemester(null);
        setShowForm(false);
    };

    const handleEdit = (semester: Semester) => {
        setEditingSemester(semester);
        setFormData({
            academic_year: semester.academic_year,
            semester_number: semester.semester_number,
            start_date: toYMD(semester.start_date),
            end_date: toYMD(semester.end_date),
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                semester_number: Number(formData.semester_number)
            };
            
            if (editingSemester) {
                await api.patch(`/semesters/${editingSemester.id}`, payload);
                toast.success("Cập nhật học kì thành công");
            } else {
                await api.post("/semesters", payload);
                toast.success("Thêm học kì thành công");
            }
            fetchSemesters();
            resetForm();
            onSuccess?.();
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (semester: Semester) => {
        const name = `Học kì ${semester.semester_number} - ${semester.academic_year}`;
        if (!confirm(`Xóa "${name}"? Các ca thi thuộc học kì này sẽ bị gỡ liên kết.`)) return;
        try {
            await api.delete(`/semesters/${semester.id}`);
            toast.success("Đã xóa học kì");
            fetchSemesters();
            onSuccess?.();
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        }
    };

    // ── Bulk Delete ──────────────────────────────────────────────
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

    const handleBulkDelete = async () => {
        if (selectedKeys.length === 0) return;
        setBulkDeleteModalOpen(false);
        
        setBulkDeleting(true);
        try {
            const res = await api.post("/semesters/bulk-delete", { ids: selectedKeys });
            const { success, failed, errors } = res.data.data;
            if (failed > 0) {
                toast.error(`Xóa thành công ${success}, thất bại ${failed}`);
                console.error("Bulk delete errors:", errors);
            } else {
                toast.success(`Đã xóa thành công ${success} học kì`);
            }
            setSelectedKeys([]);
            fetchSemesters();
            onSuccess?.();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Lỗi khi xóa nhiều học kì");
        } finally {
            setBulkDeleting(false);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedKeys((prev) =>
            prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedKeys.length === semesters.length && semesters.length > 0) {
            setSelectedKeys([]);
        } else {
            setSelectedKeys(semesters.map(p => p.id));
        }
    };



    return (
        <Modal open={open} onClose={onClose} title="Quản lý học kì" size="lg">
            <div className="space-y-4">

                {/* Thanh tìm kiếm */}
                {!showForm && (
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <SearchBar
                                value={search}
                                onChange={handleSearch}
                                placeholder="Tìm theo năm học..."
                            />
                        </div>
                        {selectedKeys.length > 0 && (
                            <Button
                                variant="danger"
                                size="sm"
                                leftIcon="trash"
                                loading={bulkDeleting}
                                onClick={() => setBulkDeleteModalOpen(true)}
                            >
                                Xóa {selectedKeys.length} mục
                            </Button>
                        )}
                    </div>
                )}

                {/* Danh sách học kì */}
                {loading ? (
                    <div className="py-8 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                        <span className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin inline-block" />
                        Đang tải...
                    </div>
                ) : semesters.length === 0 && !showForm ? (
                    <div className="py-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                        <i className="ti ti-calendar-plus text-3xl text-slate-300" />
                        {search
                            ? "Không tìm thấy học kì nào."
                            : "Chưa có học kì nào. Hãy tạo học kì đầu tiên!"}
                    </div>
                ) : (
                    !showForm && (
                        <>
                            <div className="flex items-center px-2 py-2">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-2"
                                    checked={semesters.length > 0 && selectedKeys.length === semesters.length}
                                    onChange={toggleSelectAll}
                                />
                                <span className="text-sm text-slate-500 font-medium">Chọn tất cả</span>
                            </div>
                            <div className="space-y-2 max-h-[340px] overflow-y-auto">
                                {semesters.map((semester) => {
                                    const name = `Học kì ${semester.semester_number} - ${semester.academic_year}`;
                                    return (
                                        <div
                                            key={semester.id}
                                            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors group"
                                        >
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                checked={selectedKeys.includes(semester.id)}
                                                onChange={() => toggleSelect(semester.id)}
                                            />
                                            {/* Icon + info */}
                                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                <i className="ti ti-calendar-event text-blue-600 text-base" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-slate-900 truncate">
                                                    {name}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                    <span>{formatDateShort(semester.start_date)}</span>
                                                    <span className="text-slate-300">→</span>
                                                    <span>{formatDateShort(semester.end_date)}</span>
                                                    {typeof semester.exam_schedule_count === "number" && (
                                                        <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-medium">
                                                            {semester.exam_schedule_count} ca thi
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(semester)}
                                                    className="h-7 w-7 p-0 flex items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                                                >
                                                    <i className="ti ti-edit text-sm" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(semester)}
                                                    className="h-7 w-7 p-0 flex items-center justify-center rounded-md text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <i className="ti ti-trash text-sm" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Phân trang */}
                            {meta && (
                                <Pagination
                                    page={page}
                                    totalPages={meta.totalPages}
                                    total={meta.total}
                                    limit={LIMIT}
                                    onPageChange={setPage}
                                />
                            )}
                        </>
                    )
                )}

                {/* Form thêm/sửa */}
                {showForm ? (
                    <form onSubmit={handleSubmit} className="space-y-3 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-medium text-slate-800">
                                {editingSemester ? "Sửa học kì" : "Thêm học kì mới"}
                            </h3>
                            <Button
                                                variant="ghost"
                                                size="sm"
                                                type="button"
                                                onClick={resetForm}
                                                className="h-6 w-6 p-0 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                                            >
                                                <i className="ti ti-x text-sm" />
                                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Năm học</label>
                                <select 
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
                                    value={formData.academic_year}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, academic_year: e.target.value }))}
                                    required
                                >
                                    <option value="" disabled>-- Chọn năm học --</option>
                                    {Array.from({ length: 5 }, (_, i) => {
                                        // Chỉ tạo ra các năm học từ quá khứ đến hiện tại (vd hiện tại 2026 -> lấy tới 2026-2027)
                                        const start = new Date().getFullYear() - 4 + i;
                                        const yearStr = `${start}-${start + 1}`;
                                        return <option key={yearStr} value={yearStr}>{yearStr}</option>;
                                    }).reverse()}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Học kì</label>
                                <select 
                                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
                                    value={formData.semester_number}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, semester_number: Number(e.target.value) }))}
                                >
                                    <option value={1}>Học kì 1</option>
                                    <option value={2}>Học kì 2</option>
                                    <option value={3}>Học kì 3</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <Input
                                label="Ngày bắt đầu thi"
                                type="date"
                                required
                                value={formData.start_date}
                                onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                            />
                            <Input
                                label="Ngày kết thúc thi"
                                type="date"
                                required
                                value={formData.end_date}
                                min={formData.start_date || undefined}
                                onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="secondary" size="sm" onClick={resetForm}>
                                Hủy
                            </Button>
                            <Button type="submit" variant="primary" size="sm" loading={submitting}>
                                {editingSemester ? "Cập nhật" : "Tạo học kì"}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <Button
                        type="button"
                        variant="secondary"
                        leftIcon="plus"
                        onClick={() => setShowForm(true)}
                        className="w-full"
                    >
                        Thêm học kì mới
                    </Button>
                )}
            </div>

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
                    Bạn có chắc chắn muốn xóa <span className="font-semibold text-slate-900">{selectedKeys.length}</span> học kì đã chọn không? Hành động này không thể hoàn tác.
                </p>
            </Modal>
        </Modal>
    );
}
