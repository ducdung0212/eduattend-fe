"use client";

import { ImportModal } from "@/components/shared/ImportModal";

export interface SubjectImportModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function SubjectImportModal({ open, onClose, onSuccess }: SubjectImportModalProps) {
    return (
        <ImportModal
            open={open}
            onClose={onClose}
            onSuccess={onSuccess}
            title="Import môn học từ Excel"
            endpoint="/subjects/import"
            templateUrl="/templateExcel/Subject.xlsx"
        />
    );
}