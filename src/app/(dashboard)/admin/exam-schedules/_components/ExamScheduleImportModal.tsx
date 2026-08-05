"use client";

import { ImportModal } from "@/components/shared/ImportModal";
import api from "@/lib/api";
import { Semester } from "@/types";
import { useEffect, useState } from "react";

export interface ExamScheduleImportModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ExamScheduleImportModal({ open, onClose, onSuccess }: ExamScheduleImportModalProps) {
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState("");

    useEffect(() => {
        if (open) {
            api.get('/semesters', { params: { limit: 1000 } })
                .then(res => setSemesters(res.data?.data || []))
                .catch(err => console.error("Lỗi lấy danh sách học kì", err));
            setSelectedSemesterId("");
        }
    }, [open]);

    return (
        <ImportModal
            open={open}
            onClose={onClose}
            onSuccess={onSuccess}
            title="Import ca thi từ Excel"
            endpoint="/exam-schedules/import"
            extraPayload={selectedSemesterId ? { semester_id: selectedSemesterId } : undefined}
            isSubmitDisabled={!selectedSemesterId}
            templateUrl="/TemplateExcel/ExamSchedule.xlsx"
        >
            <div className="space-y-2 mt-4 p-4 bg-slate-50 border border-slate-800 rounded-xl">
                <label className="text-sm font-semibold text-slate-700">
                    Học kì <span className="text-red-500">*</span>
                </label>
                <select
                    className="w-full px-3 py-2 border border-slate-800 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800 transition-colors"
                    value={selectedSemesterId}
                    onChange={(e) => setSelectedSemesterId(e.target.value)}
                >
                    <option value="" disabled className="text-slate-400">
                        -- Chọn học kì cho các ca thi sắp import --
                    </option>
                    {semesters.map((p) => (
                        <option key={p.id} value={p.id}>
                            Học kì {p.semester_number} - {p.academic_year}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">Các ca thi trong file sẽ được liên kết vào học kì này. Ca thi có ngày nằm ngoài thời gian học kì sẽ bị từ chối.</p>
            </div>
        </ImportModal>
    );
}