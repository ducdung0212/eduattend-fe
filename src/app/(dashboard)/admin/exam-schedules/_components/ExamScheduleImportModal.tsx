"use client";

import { ImportModal } from "@/components/shared/ImportModal";
import api from "@/lib/api";
import { ExamPeriod } from "@/types";
import { useEffect, useState } from "react";

export interface ExamScheduleImportModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ExamScheduleImportModal({ open, onClose, onSuccess }: ExamScheduleImportModalProps) {
    const [examPeriods, setExamPeriods] = useState<ExamPeriod[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState("");

    useEffect(() => {
        if (open) {
            api.get('/exam-periods', { params: { limit: 1000 } })
                .then(res => setExamPeriods(res.data?.data || []))
                .catch(err => console.error("Lỗi lấy danh sách đợt thi", err));
            setSelectedPeriodId("");
        }
    }, [open]);

    return (
        <ImportModal
            open={open}
            onClose={onClose}
            onSuccess={onSuccess}
            title="Import ca thi từ Excel"
            endpoint="/exam-schedules/import"
            extraPayload={selectedPeriodId ? { exam_period_id: selectedPeriodId } : undefined}
            isSubmitDisabled={!selectedPeriodId}
            templateUrl="/TemplateExcel/ExamSchedule.xlsx"
        >
            <div className="space-y-2 mt-4 p-4 bg-slate-50 border border-slate-800 rounded-xl">
                <label className="text-sm font-semibold text-slate-700">
                    Đợt thi <span className="text-red-500">*</span>
                </label>
                <select
                    className="w-full px-3 py-2 border border-slate-800 rounded-lg text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800 transition-colors"
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                >
                    <option value="" disabled className="text-slate-400">
                        -- Chọn đợt thi cho các ca thi sắp import --
                    </option>
                    {examPeriods.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">Các ca thi trong file sẽ được liên kết vào đợt thi này. Ca thi có ngày nằm ngoài thời gian đợt thi sẽ bị từ chối.</p>
            </div>
        </ImportModal>
    );
}