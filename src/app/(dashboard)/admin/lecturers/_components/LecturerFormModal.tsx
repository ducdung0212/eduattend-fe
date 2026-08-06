"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import { splitFullName } from "@/lib/utils";
import { Faculty, Lecturer } from "@/types";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { IconCamera, IconTrash } from "@tabler/icons-react";
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

    const [fullName, setFullName] = useState("");

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string>("");
    const [photoDeleted, setPhotoDeleted] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);
    
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
                setPhotoPreview((lecturer as any).image_url || "");
                setPhotoFile(null);
                setPhotoDeleted(false);
                setFullName(`${lecturer.last_name} ${lecturer.first_name}`.trim());
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
                setFullName("");
                setPhotoPreview("");
                setPhotoFile(null);
                setPhotoDeleted(false);
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

    const handleFullNameChange=(value:string)=>{
        setFullName(value);
        const {last_name,first_name}=splitFullName(value);
        setFormData((prev)=>({...prev,last_name,first_name}))
    }

    const handleSelectUser = (user: any) => {
        setFormData({ ...formData, user_id: user.id });
        setSearchTerm(user.email); 
        setShowDropdown(false);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleRemovePhoto = async () => {
        setPhotoFile(null);
        setPhotoPreview("");
        setPhotoDeleted(true);
        if (photoInputRef.current) photoInputRef.current.value = "";

        // Nếu đang sửa và giảng viên đã có ảnh → gọi API xóa ngay
        if (lecturer) {
            try {
                await api.delete(`/lecturer-photos/${lecturer.lecturer_code}`);
            } catch (err: any) {
                const msg = err.response?.data?.message || err.message;
                toast.error(`Lỗi khi xóa ảnh: ${msg}`);
            }
        }
    };

    const uploadPhoto = async (lecturerCode: string) => {
        if (!photoFile) return;
        const extension = photoFile.name.substring(photoFile.name.lastIndexOf('.') + 1).toLowerCase();
        const validExtension = ['jpg', 'jpeg', 'png'].includes(extension) ? extension : 'jpg'; // Fallback
        const generatePayload = [{
            fileName: `${lecturerCode}.${validExtension}`,
            fileType: photoFile.type
        }];
        const generateRes = await api.post("/lecturer-photos/generate-upload-urls", {
            files: generatePayload,
        });
        const config = generateRes.data?.data?.[0] || generateRes.data?.[0];
        if (config && config.success && config.uploadUrl) {
            await fetch(config.uploadUrl, {
                method: "PUT",
                body: photoFile,
                headers: { "Content-Type": photoFile.type },
            });
            await api.post("/lecturer-photos/confirm-uploads", {
                uploads: [{
                    fileName: config.fileName,
                    lecturer_code: lecturerCode,
                }]
            });
        }
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
                    phone: formData.phone===""?undefined:formData.phone,
                    faculty_code: formData.faculty_code,
                    user_id: formData.user_id === "" ? null : formData.user_id, 
                };
                await api.patch(`/lecturers/${lecturer.lecturer_code}`, payload);
                await uploadPhoto(lecturer.lecturer_code);
                toast.success("Cập nhật giảng viên thành công");
            } else {
                 const payload = {
                    ...formData,
                    phone: formData.phone===""?undefined:formData.phone,
                    user_id: formData.user_id === "" ? null : formData.user_id, 
                };
                const res = await api.post("/lecturers", payload);
                const newLecturerCode = res.data?.data?.lecturer_code || formData.lecturer_code;
                await uploadPhoto(newLecturerCode);
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
                
                {/* Khu vực upload ảnh */}
                <div className="flex flex-col items-center justify-center gap-3 mb-4">
                    <input 
                        type="file" 
                        accept="image/jpeg, image/png" 
                        className="hidden" 
                        ref={photoInputRef} 
                        onChange={handlePhotoChange} 
                    />
                    <div className="relative group">
                        <div 
                            className={`w-24 h-24 rounded-full border-2 border-dashed flex flex-col items-center justify-center overflow-hidden bg-slate-50 cursor-pointer transition-colors ${photoPreview ? 'border-transparent' : 'border-slate-300 hover:border-slate-400'}`}
                            onClick={() => !photoPreview && photoInputRef.current?.click()}
                        >
                            {photoPreview ? (
                                <img src={photoPreview} alt="Lecturer" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <IconCamera className="w-8 h-8 text-slate-400 mb-1" />
                                    <span className="text-[10px] text-slate-500 font-medium">Chọn ảnh</span>
                                </>
                            )}
                        </div>
                        
                        {photoPreview && (
                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button 
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    className="p-1.5 bg-white text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
                                    title="Đổi ảnh"
                                >
                                    <IconCamera className="w-4 h-4" />
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleRemovePhoto}
                                    className="p-1.5 bg-white text-rose-600 rounded-full hover:bg-rose-50 transition-colors"
                                    title="Xóa ảnh"
                                >
                                    <IconTrash className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <Input
                    label="Mã giảng viên"
                    required
                    disabled={!!lecturer}
                    value={formData.lecturer_code}
                    onChange={(e) => setFormData({ ...formData, lecturer_code: e.target.value.toUpperCase() })}
                    placeholder="Ví dụ: GV001"
                />
                <Input
                    label="Họ và tên"
                    required
                    value={fullName}
                    onChange={(e) => handleFullNameChange(e.target.value)}
                    placeholder="Nhập họ và tên..."
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
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Nhập số điện thoại"
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