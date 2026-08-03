"use client";

import { ExamSchedule } from "@/types";
import { useState, useEffect } from "react";
import { ExamDetailView } from "@/components/shared/ExamDetailView";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";

export default function LecturerAttendancePage() {
    const { user, initializing } = useAuth();
    const [schedule, setSchedule] = useState<ExamSchedule | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (initializing) return;
        if (!user?.lecturer_code) {
            setLoading(false);
            return;
        }

        let isMounted = true;
        const fetchOngoing = async () => {
            setLoading(true);
            try {
                const res = await api.get("/exam-schedules/ongoing", {
                    params: {
                        lecturer_code: user.lecturer_code,
                        limit: 1,
                    },
                });
                if (isMounted && res.data?.data?.length > 0) {
                    setSchedule(res.data.data[0]);
                }
            } catch (e) {
                console.error("Lỗi khi tải ca thi đang diễn ra:", e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchOngoing();

        return () => {
            isMounted = false;
        };
    }, [user?.lecturer_code, initializing]);

    if (initializing || loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
                <span className="w-8 h-8 rounded-full border-[3px] border-slate-200 border-t-blue-500 animate-spin inline-block" />
                <p className="text-sm font-medium">Đang tải thông tin ca thi...</p>
            </div>
        );
    }

    if (!schedule) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-4 bg-white border border-slate-200/70 rounded-xl shadow-sm">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                    <i className="ti ti-clock-off text-5xl text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">Không có ca thi nào đang diễn ra</h3>
                <p className="text-sm text-center text-slate-500 max-w-md leading-relaxed">
                    Hiện tại bạn không phụ trách giám thị ca thi nào.
                    <br />Các ca thi sẽ hiển thị ở đây khi đến giờ thi.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden p-5 shadow-sm">
            <ExamDetailView schedule={schedule} />
        </div>
    );
}
