import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { Subject } from "@/types";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface SubjectFormModalProps {
    open: boolean;
    subject: Subject | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function SubjectFormModal({ open, subject, onClose, onSuccess }: SubjectFormModalProps) {
    const [formData, setFormData] = useState({ subject_code: "", name: "" });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            if (subject) {
                setFormData({ subject_code: subject.subject_code, name: subject.name });
            } else {
                setFormData({ subject_code: "", name: "" });
            }
        }
    }, [open, subject]);

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (subject) {
                const payload = { name: formData.name };
                await api.patch(`/subjects/${subject.subject_code}`, payload);
                toast.success('Cập nhật môn học thành công');
            } else {
                await api.post('/subjects', formData);
                toast.success("Thêm môn học thành công");
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
            title={subject ? "Sửa môn học" : "Thêm môn học"}
            footer={
                <>
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button type="submit" variant="primary" form="subject-form" loading={submitting}>
                        Lưu
                    </Button>
                </>
            }
        >
            <form id="subject-form" onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Mã môn học"
                    value={formData.subject_code}
                    onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                    disabled={!!subject}
                    required
                />
                <Input
                    label="Tên môn học"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />
            </form>
        </Modal>
    );
}