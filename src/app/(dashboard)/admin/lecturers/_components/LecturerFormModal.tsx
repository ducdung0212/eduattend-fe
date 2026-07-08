"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { Faculty, Lecturer } from "@/types";
import React, { useEffect, useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";

interface LecturerFormModalProps {
    open: boolean;
    lecturer: Lecturer | null; 
    onClose: () => void;
    onSuccess: () => void;
}

export function LecturerFormModal({ open, lecturer, onClose, onSuccess }: LecturerFormModalProps) {
    const [formData, setFormData] = useState({
        lecturer_code: "",
        last_name: "",
        first_name: "",
        email: "",
        phone: "",
        faculty_code: "",
        create_account: false,
        user_id: "", 
    });

    const [submitting, setSubmitting] = useState(false);
    const [faculties, setFaculties] = useState<Faculty[]>([]);

    // --- State cho tính năng tìm kiếm tài khoản ---
    const [searchTerm, setSearchTerm] = useState("");
    const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Xử lý click ra ngoài để đóng dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Khởi tạo data khi mở modal
    useEffect(() => {
        if (open) {
            if (lecturer) {
                setFormData({
                    lecturer_code: lecturer.lecturer_code ?? "",
                    last_name: lecturer.last_name ?? "",
                    first_name: lecturer.first_name ?? "",
                    email: lecturer.email ?? "",
                    phone: lecturer.phone ?? "",
                    faculty_code: lecturer.faculty?.faculty_code ?? "",
                    create_account: false, 
                    user_id: lecturer.user?.id ?? "", 
                });
                setSearchTerm(lecturer.user?.email || "");
            } else {
                setFormData({
                    lecturer_code: "",
                    last_name: "",
                    first_name: "",
                    email: "",
                    phone: "",
                    faculty_code: "",
                    create_account: false,
                    user_id: "", 
                });
                setSearchTerm("");
            }
            setSearchedUsers([]);
            setShowDropdown(false);
        }
        
        const fetchFaculties = async () => {
            try {
                const res = await api.get("/faculties");
                setFaculties(res.data?.data);
            } catch (e) {
                console.error("Lỗi khi tải danh sách khoa:", e);
            }
        };
        fetchFaculties();
    }, [open, lecturer]);

    // --- ĐỒNG BỘ: Tách logic tìm kiếm giống hệt fetchLecturers trong page.tsx ---
    const fetchUsers = useCallback(async () => {
        // Bỏ qua nếu dropdown đang đóng hoặc từ khóa chưa đủ 2 ký tự
        if (!searchTerm || searchTerm.length < 2 || !showDropdown) {
            if (!searchTerm) setSearchedUsers([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await api.get("/users", {
                params: { search: searchTerm, limit: 5,role:'lecturer' }
            });
            setSearchedUsers(res.data?.data || []);
        } catch (error) {
            console.error("Lỗi tìm kiếm tài khoản:", error);
        } finally {
            setIsSearching(false);
        }
    }, [searchTerm, showDropdown]);

    // --- ĐỒNG BỘ: Sử dụng useEffect debounce tương tự page.tsx ---
    useEffect(() => {
        const t = setTimeout(fetchUsers, searchTerm ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchUsers, searchTerm]);


    const handleSelectUser = (user: any) => {
        setFormData({ ...formData, user_id: user.id });
        setSearchTerm(user.email); 
        setShowDropdown(false);
    };

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (lecturer) {
                const payload = {
                    last_name: formData.last_name,
                    first_name: formData.first_name,
                    email: formData.email,
                    phone: formData.phone,
                    faculty_code: formData.faculty_code,
                    user_id: formData.user_id === "" ? null : formData.user_id, 
                };
                await api.patch(`/lecturers/${lecturer.lecturer_code}`, payload);
                toast.success("Cập nhật giảng viên thành công");
            } else {
                await api.post("/lecturers", formData);
                toast.success("Thêm giảng viên thành công");
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
            title={lecturer ? "Sửa giảng viên" : "Thêm giảng viên"}
            footer={
                <>
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button type="submit" variant="primary" form="lecturer-form" loading={submitting}>
                        Lưu
                    </Button>
                </>
            }
        >
            <form id="lecturer-form" onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Mã giảng viên"
                    required
                    disabled={!!lecturer}
                    value={formData.lecturer_code}
                    onChange={(e) => setFormData({ ...formData, lecturer_code: e.target.value.toUpperCase() })}
                    placeholder="Ví dụ: GV001"
                />
                <Input
                    label="Họ và tên lót"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Nguyễn Văn..."
                />
                <Input
                    label="Tên"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="A"
                />
                <Input
                    label="Email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email giảng viên"
                />
                <Input
                    label="Số điện thoại"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0123456789"
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

                {/* Section Tài khoản */}
                <div className="pt-4 mt-2 border-t border-slate-100">
                    {!lecturer ? (
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.create_account}
                                onChange={(e) => setFormData({ ...formData, create_account: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                                Tạo tài khoản hệ thống cho giảng viên này
                            </span>
                        </label>
                    ) : (
                        <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200" ref={dropdownRef}>
                            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
                                Quản lý liên kết tài khoản
                            </span>
                            
                            {/* Khu vực Tìm kiếm tài khoản */}
                            <div className="relative">
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                                    Tìm & Liên kết tài khoản
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border text-sm text-slate-900 bg-white h-9 px-3 outline-none transition-colors border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                                        placeholder="Nhập tên hoặc email để tìm..."
                                        value={searchTerm}
                                        onFocus={() => setShowDropdown(true)}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setShowDropdown(true);
                                            if (e.target.value === "") {
                                                setFormData({ ...formData, user_id: "" });
                                            }
                                        }}
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-2.5">
                                            <span className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin inline-block"></span>
                                        </div>
                                    )}
                                </div>

                                {/* Dropdown kết quả */}
                                {showDropdown && searchTerm.length >= 2 && (
                                    <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-md max-h-60 overflow-y-auto">
                                        {!isSearching && searchedUsers.length === 0 ? (
                                            <li className="px-4 py-3 text-sm text-slate-500 text-center">
                                                Không tìm thấy tài khoản nào phù hợp
                                            </li>
                                        ) : (
                                            searchedUsers.map((user) => (
                                                <li 
                                                    key={user.id}
                                                    onClick={() => handleSelectUser(user)}
                                                    className="px-3 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors flex flex-col"
                                                >
                                                    <span className="text-sm font-medium text-slate-800">{user.email}</span>
                                                    <span className="text-xs text-slate-500">{user.name}</span>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                )}
                            </div>
                            
                            {/* Feedback trực quan */}
                            <div className="mt-1">
                                {formData.user_id ? (
                                    <p className="text-xs text-green-600 flex items-center gap-1.5 font-medium">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Đã chọn liên kết với tài khoản này
                                    </p>
                                ) : (
                                    <p className="text-xs text-amber-600 flex items-center gap-1.5 font-medium">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        Sẽ hủy liên kết (chưa có tài khoản)
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    )
}