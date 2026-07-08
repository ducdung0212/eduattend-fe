"use client";

import { SearchBar } from "@/components/shared/SearchBar";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { ExamSchedule } from "@/types";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ExamScheduleTimelineView } from "@/components/shared/ExamScheduleTimelineView";

const LIMIT=100;

export default function ExamSchedulePage() {
    const { user, initializing } = useAuth();
    const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchExamSchedules = useCallback(async () => {
        if (!user?.student_code) return;
        setLoading(true);
        try {
            const res = await api.get("/exam-schedules", {
                params: {
                    limit: LIMIT, // Lấy tất cả lịch thi của kỳ
                    search: search || undefined,
                    student_code: user.student_code,
                },
            });
            setExamSchedules(res.data?.data ?? []);
        } catch (e) {
            console.error("Lỗi khi tải danh sách lịch thi:", e);
            toast.error("Không thể tải danh sách lịch thi");
        } finally {
            setLoading(false);
        }
    }, [search, user?.student_code]);

    useEffect(() => {
        if (initializing) return;
        if (!user?.student_code) {
            setLoading(false);
            return;
        }
        const t = setTimeout(fetchExamSchedules, search ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchExamSchedules, search, user?.student_code, initializing]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-medium text-slate-900 tracking-tight">
                        Lịch thi của tôi
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Xem chi tiết lịch thi theo ngày
                    </p>
                </div>
            </div>

            <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden shadow-sm">
                {/* Bộ lọc */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap bg-slate-50/50">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Tìm theo môn, phòng thi..."
                        className="flex-1 min-w-[200px] max-w-md"
                    />
                </div>

                {/* Nội dung — Timeline View */}
                <ExamScheduleTimelineView
                    examSchedules={examSchedules}
                    loading={loading}
                    variant="student"
                />
            </div>
        </div>
    );
}