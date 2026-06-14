'use client'

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { Room } from "@/types";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface RoomFormModalProps {
    open: boolean;
    room: Room | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function RoomFormModal({ open, room, onClose, onSuccess }: RoomFormModalProps) {
    const [formData, setFormData] = useState({ room_code: "", name: "", capacity: 0 });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            if (room) {
                setFormData({ room_code: room.room_code, name: room.name, capacity: room.capacity });
            } else {
                setFormData({ room_code: "", name: "", capacity: 0 });
            }
        }
    }, [open, room]);

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (room) {
                const payload = { name: formData.name, capacity: formData.capacity };
                await api.patch(`/rooms/${room.room_code}`, payload);
                toast.success('Cập nhật phòng thành công');
            } else {
                await api.post("/rooms", formData);
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
            title={room ? "Sửa phòng" : "Thêm phòng"}
            footer={
                <>
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button type="submit" form="room-form" variant="primary" loading={submitting}>
                        Lưu
                    </Button>
                </>
            }
        >
            <form id="room-form" onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Mã Phòng"
                    required
                    disabled={!!room} // Khóa cứng trường này nếu ở chế độ chỉnh sửa (Sửa)
                    value={formData.room_code}
                    onChange={(e) => setFormData({ ...formData, room_code: e.target.value.toUpperCase() })}
                    placeholder="Ví dụ: C705"
                />
                <Input
                    label="Tên Phòng"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: C705"
                />
                <Input
                    type="number"
                    label="Sức chứa"
                    required
                    min={1}
                    value={formData.capacity}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            capacity: e.target.value === "" ? 0 : Number(e.target.value),
                        })
                    }
                    placeholder="Ví dụ: 40"
                />
            </form>
        </Modal>
    )


}