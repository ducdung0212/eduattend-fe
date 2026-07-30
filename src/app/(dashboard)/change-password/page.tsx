"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const [curPass, setCurPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");

    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!curPass) {
            setError("Vui lòng nhập mật khẩu hiện tại");
            return;
        }

        if (newPass.length < 6) {
            setError("Mật khẩu mới phải từ 6 ký tự trở lên");
            return;
        }

        if (newPass !== confirmPass) {
            setError("Mật khẩu xác nhận không khớp");
            return;
        }

        setIsLoading(true);
        try {
            const res = await api.post("/auth/change-password", {
                curPass,
                newPass
            });
            toast.success(res.data?.message || "Đổi mật khẩu thành công!");

            // Clear form
            setCurPass("");
            setNewPass("");
            setConfirmPass("");


        } catch (err: any) {
            console.error("Lỗi đổi mật khẩu:", err);
            const msg = err.response?.data?.message || "Có lỗi xảy ra khi đổi mật khẩu";
            setError(Array.isArray(msg) ? msg.join(", ") : msg);
            toast.error("Đổi mật khẩu thất bại");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-medium text-slate-900 tracking-tight">
                    Đổi Mật Khẩu
                </h1>
            </div>
            <div className="max-w-xl mx-auto py-10 px-4 sm:px-6 lg:px-8">

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                        {error && (
                            <div className="p-4 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100 flex items-center gap-2">
                                <i className="ti ti-alert-circle text-lg shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <Input
                                    label="Mật khẩu hiện tại"
                                    type="password"
                                    value={curPass}
                                    onChange={(e) => setCurPass(e.target.value)}
                                    placeholder="Nhập mật khẩu hiện tại"
                                    leftIcon="lock"
                                    required
                                />
                            </div>

                            <div>
                                <Input
                                    label="Mật khẩu mới"
                                    type="password"
                                    value={newPass}
                                    onChange={(e) => setNewPass(e.target.value)}
                                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                                    leftIcon="key"
                                    required
                                />
                            </div>

                            <div>
                                <Input
                                    label="Xác nhận mật khẩu mới"
                                    type="password"
                                    value={confirmPass}
                                    onChange={(e) => setConfirmPass(e.target.value)}
                                    placeholder="Nhập lại mật khẩu mới"
                                    leftIcon="check"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => router.back()}
                                disabled={isLoading}
                            >
                                Hủy bỏ
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                loading={isLoading}
                            >
                                Lưu thay đổi
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}