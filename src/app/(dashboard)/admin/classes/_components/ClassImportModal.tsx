"use client";

import { ImportModal } from "@/components/shared/ImportModal";

export interface ClassImportModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ClassImportModal({ open, onClose, onSuccess }: ClassImportModalProps) {
    return (
        <ImportModal
            open={open}
            onClose={onClose}
            onSuccess={onSuccess}
            title="Import lớp từ Excel"
            endpoint="/classes/import"
            templateUrl="/TemplateExcel/Class.xlsx"
        />
    );
}