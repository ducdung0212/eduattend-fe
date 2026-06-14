"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { Class, Faculty, Student } from "@/types";
import React, { useEffect, useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";

interface StudentFormModalProps {
    open: boolean;
    student: Student|null;
    onClose: () => void;
    onSuccess: () => void;
}

export function StudentFormModal({ open, student, onClose, onSuccess }: StudentFormModalProps) {
    const [formData, setFormData] = useState({
        student_code: "",
        last_name: "",
        first_name: "",
        email: "",
        phone: "",
        class_code: "",
        create_account: false,
        user_id: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedFacultyCode, setSelectedFacultyCode] = useState("");
    const [classSearch, setClassSearch] = useState("");
    const [showClassDropdown, setShowClassDropdown] = useState(false);
    const classDropdownRef = useRef<HTMLDivElement>(null);

    // --- State cho tính năng tìm kiếm tài khoản ---
    const [searchTerm, setSearchTerm] = useState("");
    const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Xử lý click ra ngoài để đóng cả 2 dropdown (Lớp và Tài khoản)
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
                setShowClassDropdown(false);
            }
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
            if (student) {
                const facultyCode = student.class.faculty.faculty_code ?? "";
                setSelectedFacultyCode(facultyCode);
                setClassSearch(`${student.class?.name ?? ""} (${student.class?.class_code ?? ""})`);
                setFormData({
                    student_code: student.student_code ?? "",
                    last_name: student.last_name ?? "",
                    first_name: student.first_name ?? "",
                    email: student.email ?? "",
                    phone: student.phone ?? "",
                    class_code: student.class?.class_code ?? "",
                    create_account: false,
                    user_id: student.user.id ?? "",
                });
                setSearchTerm(student.user.email || "");
            } else {
                setFormData({
                    student_code: "",
                    last_name: "",
                    first_name: "",
                    email: "",
                    phone: "",
                    class_code: "",
                    create_account: false,
                    user_id: "",
                });
                setSearchTerm("");
                setSelectedFacultyCode("");
                setClassSearch("");
            }
            setSearchedUsers([]);
            setShowDropdown(false);
        }
    }, [open, student]);

    // Fetch danh sách khoa khi mở modal
    useEffect(() => {
        const fetchFaculties = async () => {
            try {
                const res = await api.get("/faculties");
                setFaculties(res.data?.data);
            } catch (e) {
                console.error(e);
            }
        };
        if (open) fetchFaculties();
    }, [open]);

    // Fetch danh sách lớp khi chọn khoa
    useEffect(() => {
        if (!selectedFacultyCode) {
            setClasses([]);
            return;
        }
        const fetchClasses = async () => {
            try {
                const res = await api.get("/classes", {
                    params: { faculty_code: selectedFacultyCode }
                });
                setClasses(res.data?.data);
            } catch (e) {
                console.error(e);
            }
        };
        fetchClasses();
    }, [selectedFacultyCode]);

    // Tìm kiếm tài khoản liên kết
    const fetchUsers = useCallback(async () => {
        if (!searchTerm || searchTerm.length < 2 || !showDropdown) {
            if (!searchTerm) setSearchedUsers([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await api.get("/users", {
                params: { search: searchTerm, limit: 5,role:'student' }
            });
            setSearchedUsers(res.data?.data || []);
        } catch (error) {
            console.error("Lỗi tìm kiếm tài khoản:", error);
        } finally {
            setIsSearching(false);
        }
    }, [searchTerm, showDropdown]);

    // Debounce tìm kiếm tài khoản
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
            if (student) {
                const payload = {
                    last_name: formData.last_name,
                    first_name: formData.first_name,
                    email: formData.email,
                    phone: formData.phone,
                    class_code: formData.class_code,
                    user_id: formData.user_id === "" ? null : formData.user_id,
                };
                await api.patch(`/students/${student.student_code}`, payload);
                toast.success("Cập nhật sinh viên thành công");
            } else {
                await api.post("/students", formData);
                toast.success("Thêm sinh viên thành công");
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
            title={student ? "Sửa sinh viên" : "Thêm sinh viên"}
            footer={
                <>
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button type="submit" variant="primary" form="student-form" loading={submitting}>
                        Lưu
                    </Button>
                </>
            }
        >
            <form id="student-form" onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Mã sinh viên"
                    required
                    disabled={!!student}
                    value={formData.student_code}
                    onChange={(e) => setFormData({ ...formData, student_code: e.target.value.toUpperCase() })}
                    placeholder="Ví dụ: DH52200001"
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
                    placeholder="Email sinh viên"
                />
                <Input
                    label="Số điện thoại"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0123456789"
                />

                {/* Chọn khoa */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">Khoa</label>
                    <select
                        required
                        value={selectedFacultyCode}
                        onChange={(e) => {
                            setSelectedFacultyCode(e.target.value);
                            setFormData({ ...formData, class_code: "" }); // reset lớp khi đổi khoa
                            setClassSearch("");
                        }}
                        className="w-full rounded-lg border text-sm text-slate-900 bg-white h-9 px-3 outline-none transition-colors border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    >
                        <option value="" disabled>-- Chọn khoa --</option>
                        {faculties.map((f) => (
                            <option key={f.faculty_code} value={f.faculty_code}>
                                {f.name} ({f.faculty_code})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Chọn lớp — combobox */}
                <div className="flex flex-col gap-1.5" ref={classDropdownRef}>
                    <label className="text-sm font-medium text-slate-700">Lớp</label>
                    <div className="relative">
                        <input
                            type="text"
                            required
                            disabled={!selectedFacultyCode}
                            placeholder={selectedFacultyCode ? "Gõ để tìm lớp..." : "Chọn khoa trước..."}
                            value={classSearch}
                            onFocus={() => setShowClassDropdown(true)}
                            onChange={(e) => {
                                setClassSearch(e.target.value);
                                setShowClassDropdown(true);
                                if (e.target.value === "") setFormData({ ...formData, class_code: "" });
                            }}
                            className="w-full rounded-lg border text-sm text-slate-900 bg-white h-9 px-3 outline-none transition-colors border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                        />
                        {showClassDropdown && selectedFacultyCode && (
                            <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-md max-h-52 overflow-y-auto">
                                {classes
                                    .filter((c) =>
                                        c.class_code.toLowerCase().includes(classSearch.toLowerCase()) ||
                                        c.name.toLowerCase().includes(classSearch.toLowerCase())
                                    )
                                    .map((c) => (
                                        <li
                                            key={c.class_code}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setFormData({ ...formData, class_code: c.class_code });
                                                setClassSearch(`${c.name} (${c.class_code})`);
                                                setShowClassDropdown(false);
                                            }}
                                            className={`px-3 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 flex flex-col ${
                                                formData.class_code === c.class_code ? "bg-blue-50" : ""
                                            }`}
                                        >
                                            <span className="text-sm font-medium text-slate-800">{c.name}</span>
                                            <span className="text-xs text-slate-500">{c.class_code}</span>
                                        </li>
                                    ))}
                                {classes.filter((c) =>
                                    c.class_code.toLowerCase().includes(classSearch.toLowerCase()) ||
                                    c.name.toLowerCase().includes(classSearch.toLowerCase())
                                ).length === 0 && (
                                    <li className="px-4 py-3 text-sm text-slate-500 text-center">
                                        Không tìm thấy lớp nào
                                    </li>
                                )}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Section Tài khoản */}
                <div className="pt-4 mt-2 border-t border-slate-100">
                    {!student ? (
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={formData.create_account}
                                onChange={(e) => setFormData({ ...formData, create_account: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                                Tạo tài khoản hệ thống cho sinh viên này
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

                                {/* Dropdown kết quả tài khoản */}
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
    );
}