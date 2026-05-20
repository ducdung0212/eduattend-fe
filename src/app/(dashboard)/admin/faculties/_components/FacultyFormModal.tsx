"use client";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

interface Faculty {
  faculty_code: string;
  name: string;
}

interface FacultyFormModalProps {
  open: boolean;
  faculty: Faculty | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function FacultyFormModal({ open, faculty, onClose, onSuccess }: FacultyFormModalProps) {
  const [formData, setFormData] = useState({ faculty_code: "", name: "" });
  const [submitting, setSubmitting] = useState(false);

  // Điền dữ liệu cũ mỗi khi mở modal sửa, hoặc dọn form nếu thêm mới
  useEffect(() => {
    if (open) {
      if (faculty) {
        setFormData({ faculty_code: faculty.faculty_code, name: faculty.name });
      } else {
        setFormData({ faculty_code: "", name: "" });
      }
    }
  }, [open, faculty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (faculty) {
        // Chỉ truyền trường name lên theo đúng yêu cầu nghiệp vụ khóa cứng mã khoa khi sửa
        const payload = { name: formData.name };
        await api.patch(`/faculties/${faculty.faculty_code}`, payload);
        toast.success('Cập nhật khoa thành công');
      } else {
        await api.post("/faculties", formData);
        toast.success('Thêm khoa thành công');
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
      title={faculty ? "Sửa khoa" : "Thêm khoa"}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="faculty-form" variant="primary" loading={submitting}>
            Lưu lại
          </Button>
        </>
      }
    >
      <form id="faculty-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Mã Khoa"
          required
          disabled={!!faculty} // Khóa cứng trường này nếu ở chế độ chỉnh sửa (Sửa)
          value={formData.faculty_code}
          onChange={(e) => setFormData({ ...formData, faculty_code: e.target.value.toUpperCase() })}
          placeholder="Ví dụ: CNTT"
        />
        <Input
          label="Tên Khoa"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ví dụ: Công nghệ thông tin"
        />
      </form>
    </Modal>
  );
}