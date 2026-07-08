"use client";

import { ExamSchedule } from "@/types";
import { useState } from "react";
import { OngoingExamCards } from "@/components/shared/OngoingExamCards";
import { ExamDetailView } from "@/components/shared/ExamDetailView";
import { useAuth } from "@/hooks/useAuth";

type ViewState =
    | { view: "list" }
    | { view: "detail"; schedule: ExamSchedule };

export default function LecturerAttendancePage() {
    const [viewState, setViewState] = useState<ViewState>({ view: "list" });
    const { user } = useAuth();

    return (
        <div className="space-y-4">
            {/* Header */}
            {viewState.view === "list" && (
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-xl font-medium text-slate-900 tracking-tight">
                            Điểm danh phòng thi của tôi
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Các ca thi bạn đang phụ trách giám thị tại thời điểm hiện tại
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-white border border-slate-200/70 rounded-xl overflow-hidden p-5">
                {viewState.view === "list" && (
                    <OngoingExamCards
                        lecturerCode={user?.lecturer_code}
                        variant="lecturer"
                        onSelectSchedule={(schedule) =>
                            setViewState({ view: "detail", schedule })
                        }
                    />
                )}

                {viewState.view === "detail" && (
                    <ExamDetailView
                        schedule={viewState.schedule}
                        onBack={() => setViewState({ view: "list" })}
                    />
                )}
            </div>
        </div>
    );
}
