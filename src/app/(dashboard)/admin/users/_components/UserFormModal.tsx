"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { User } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

interface UserFormModalProps {
    open: boolean;
    user: User | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function UserFormModal({ open, user, onClose, onSuccess }: UserFormModalProps) {
    const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "student" });
    const [submitting, setSubmitting] = useState(false);

    // Điền dữ liệu cũ mỗi khi mở modal sửa, hoặc dọn form nếu thêm mới
    useEffect(() => {
        if (open) {
            if (user) {
                setFormData({ name: user.name, email: user.email, password: "", role: user.role });
            } else {
                setFormData({ name: "", email: "", password: "", role: "student" });
            }
        }
    }, [open, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (user) {
                const payload: any = { name: formData.name, email: formData.email, role: formData.role };
                if (formData.password) payload.password = formData.password;
                await api.patch(`/users/${user.id}`, payload);
                toast.success('Cập nhật người dùng thành công');
            } else {
                await api.post("/users", formData);
                toast.success('Thêm người dùng thành công');
            }
            onSuccess(); // Báo cho Page cập nhật lại danh sách dữ liệu
            onClose();   // Đóng Modal hiện tại
        } catch (err: any) {
            // NestJS backend thường báo lỗi qua message array hoặc string
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
            title={user ? "Sửa người dùng" : "Thêm người dùng"}
            footer={
                <>
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button type="submit" form="user-form" variant="primary" loading={submitting}>
                        Lưu lại
                    </Button>
                </>
            }
        >
            <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Tên"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <Input
                    label="Email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                    label={user ? "Mật khẩu (để trống nếu không đổi)" : "Mật khẩu"}
                    type="password"
                    required={!user}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Vai trò</label>
                    <select
                        className="w-full text-black px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                        <option value="admin">Admin</option>
                        <option value="lecturer">Giảng viên</option>
                        <option value="student">Sinh viên</option>
                    </select>
                </div>
            </form>
        </Modal>
    );
}