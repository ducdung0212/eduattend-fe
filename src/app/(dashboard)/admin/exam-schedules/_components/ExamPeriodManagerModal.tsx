'use client';

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/shared/Pagination";
import { SearchBar } from "@/components/shared/SearchBar";
import { usePagination } from "@/hooks/usePagination";
import api from "@/lib/api";
import { ExamPeriod, PaginationMeta } from "@/types";
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

interface ExamPeriodManagerModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const LIMIT = 5;

export function ExamPeriodManagerModal({ open, onClose, onSuccess }: ExamPeriodManagerModalProps) {
    const [periods, setPeriods] = useState<ExamPeriod[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState("");

    const { page, setPage, reset: resetPage } = usePagination(meta?.totalPages ?? 1);

    // Form state
    const [editingPeriod, setEditingPeriod] = useState<ExamPeriod | null>(null);
    const [formData, setFormData] = useState({ name: "", start_date: "", end_date: "" });
    const [showForm, setShowForm] = useState(false);

    const fetchPeriods = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/exam-periods", {
                params: {
                    page,
                    limit: LIMIT,
                    search: search || undefined,
                },
            });
            setPeriods(res.data?.data || []);
            setMeta(res.data?.meta ?? null);
        } catch {
            toast.error("Không thể tải danh sách đợt thi");
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        if (open) {
            fetchPeriods();
        }
    }, [open, fetchPeriods]);

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
        setFormData({ name: "", start_date: "", end_date: "" });
        setEditingPeriod(null);
        setShowForm(false);
    };

    const handleEdit = (period: ExamPeriod) => {
        setEditingPeriod(period);
        setFormData({
            name: period.name,
            start_date: period.start_date.slice(0, 10),
            end_date: period.end_date.slice(0, 10),
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingPeriod) {
                await api.patch(`/exam-periods/${editingPeriod.id}`, formData);
                toast.success("Cập nhật đợt thi thành công");
            } else {
                await api.post("/exam-periods", formData);
                toast.success("Thêm đợt thi thành công");
            }
            fetchPeriods();
            resetForm();
            onSuccess?.();
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (period: ExamPeriod) => {
        if (!confirm(`Xóa đợt thi "${period.name}"? Các ca thi thuộc đợt này sẽ được gỡ liên kết.`)) return;
        try {
            await api.delete(`/exam-periods/${period.id}`);
            toast.success("Đã xóa đợt thi");
            fetchPeriods();
            onSuccess?.();
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    return (
        <Modal open={open} onClose={onClose} title="Quản lý đợt thi" size="lg">
            <div className="space-y-4">

                {/* Thanh tìm kiếm */}
                {!showForm && (
                    <SearchBar
                        value={search}
                        onChange={handleSearch}
                        placeholder="Tìm theo tên đợt thi..."
                    />
                )}

                {/* Danh sách đợt thi */}
                {loading ? (
                    <div className="py-8 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
                        <span className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin inline-block" />
                        Đang tải...
                    </div>
                ) : periods.length === 0 && !showForm ? (
                    <div className="py-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                        <i className="ti ti-calendar-plus text-3xl text-slate-300" />
                        {search
                            ? "Không tìm thấy đợt thi nào."
                            : "Chưa có đợt thi nào. Hãy tạo đợt thi đầu tiên!"}
                    </div>
                ) : (
                    !showForm && (
                        <>
                            <div className="space-y-2 max-h-[340px] overflow-y-auto">
                                {periods.map((period) => (
                                    <div
                                        key={period.id}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors group"
                                    >
                                        {/* Icon + info */}
                                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                            <i className="ti ti-calendar-event text-blue-600 text-base" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-slate-900 truncate">
                                                {period.name}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                <span>{formatDate(period.start_date)}</span>
                                                <span className="text-slate-300">→</span>
                                                <span>{formatDate(period.end_date)}</span>
                                                {typeof period.exam_schedule_count === "number" && (
                                                    <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-medium">
                                                        {period.exam_schedule_count} ca thi
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(period)}
                                                className="h-7 w-7 flex items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                                            >
                                                <i className="ti ti-edit text-sm" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(period)}
                                                className="h-7 w-7 flex items-center justify-center rounded-md text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <i className="ti ti-trash text-sm" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
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
                                {editingPeriod ? "Sửa đợt thi" : "Thêm đợt thi mới"}
                            </h3>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                <i className="ti ti-x text-sm" />
                            </button>
                        </div>
                        <Input
                            label="Tên đợt thi"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="VD: Đợt thi cuối kỳ HK2 2025-2026"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700">Ngày bắt đầu</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.start_date}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                                    className="w-full rounded-lg border text-sm text-slate-900 bg-white h-9 px-3 outline-none transition-colors border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-slate-700">Ngày kết thúc</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.end_date}
                                    min={formData.start_date || undefined}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                                    className="w-full rounded-lg border text-sm text-slate-900 bg-white h-9 px-3 outline-none transition-colors border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <Button type="button" variant="secondary" size="sm" onClick={resetForm}>
                                Hủy
                            </Button>
                            <Button type="submit" variant="primary" size="sm" loading={submitting}>
                                {editingPeriod ? "Cập nhật" : "Tạo đợt thi"}
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
                        Thêm đợt thi mới
                    </Button>
                )}
            </div>
        </Modal>
    );
}
