"use client";

import { ImportModal } from "@/components/shared/ImportModal";

export interface RoomImportModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function RoomImportModal({ open, onClose, onSuccess }: RoomImportModalProps) {
    return (
        <ImportModal
            open={open}
            onClose={onClose}
            onSuccess={onSuccess}
            title="Import phòng học từ Excel"
            endpoint="/rooms/import"
            templateUrl="/templateExcel/Room.xlsx"
        />
    );
}