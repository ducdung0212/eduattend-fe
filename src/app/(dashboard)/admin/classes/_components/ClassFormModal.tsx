"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { Class, Faculty } from "@/types";
import {  useEffect, useState } from "react";
import toast from "react-hot-toast";

interface ClassFormModalProps {
    open: boolean;
    class: Class | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function ClassFormModal({ open, class: classItem, onClose, onSuccess }: ClassFormModalProps) {
    const [formData, setFormData] = useState({ class_code: "", name: "", faculty_code: "" });
    const [submitting, setSubmitting] = useState(false);
    const [faculties, setFaculties] = useState<Faculty[]>([]);


    useEffect(() => {
        if (open) {
            if (classItem) {
                setFormData({ class_code: classItem.class_code, name: classItem.name, faculty_code: classItem.faculty.faculty_code || "" });
            } else {
                setFormData({ class_code: "", name: "", faculty_code: "" });
            }
        }
        // Fetch faculties cùng lúc
        const fetchFaculties = async () => {
            try {
                const res = await api.get("/faculties");
                setFaculties(res.data?.data);
            } catch (e) {
                console.error("Lỗi khi tải danh sách khoa:", e);
            }
        };
        fetchFaculties();
    }, [open, classItem]);

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (classItem) {
                const payload = { 
                    name: formData.name,
                    faculty_code:formData.faculty_code
                 };
                await api.patch(`/classes/${classItem.class_code}`, payload);
                toast.success('Cập nhật lớp thành công');
            } else {
                await api.post("/classes", formData);
                toast.success('Thêm lớp thành công');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message;
            toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={classItem ? "Sửa lớp" : "Thêm lớp"}
            footer={
                <>
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button type="submit" variant="primary" form="class-form" loading={submitting}>
                        Lưu
                    </Button>
                </>
            }
        >
            <form id="class-form" onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Mã lớp"
                    required
                    disabled={!!classItem} // Khóa cứng trường này nếu ở chế độ chỉnh sửa (Sửa)
                    value={formData.class_code}
                    onChange={(e) => setFormData({ ...formData, class_code: e.target.value.toUpperCase() })}
                    placeholder="Ví dụ: D22_TH03"
                />
                <Input
                    label="Tên lớp"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: D22_TH03"
                />

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="faculty" className="text-sm font-medium text-slate-700">
                        Khoa quản lý
                    </label>
                    <div className="relative">
                        <select
                            id="faculty"
                            required
                            value={formData.faculty_code}
                            onChange={(e) => setFormData({ ...formData, faculty_code: e.target.value })}
                            className={`w-full rounded-lg border text-sm text-slate-900 bg-white h-9 px-3 outline-none transition-colors border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed`}
                        >
                            <option value="" disabled>-- Chọn khoa quản lý --</option>
                            {faculties.map((f) => (
                                <option key={f.faculty_code} value={f.faculty_code}>
                                    {f.name} ({f.faculty_code})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
