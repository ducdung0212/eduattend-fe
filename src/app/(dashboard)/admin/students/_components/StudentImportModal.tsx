"use client";

import { ImportModal } from "@/components/shared/ImportModal";
import { useState } from "react";

export function StudentImportModal({ open, onClose, onSuccess }: { open: boolean, onClose: () => void, onSuccess: () => void }) {
    const [createAccount, setCreateAccount] = useState(false);

    return (
        <ImportModal
            open={open}
            onClose={onClose}
            onSuccess={onSuccess}
            title="Import sinh viên từ Excel"
            endpoint="/students/import"
            extraPayload={{ create_account: String(createAccount) }}
            templateUrl="/TemplateExcel/Student.xlsx"
        >
            <label className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl cursor-pointer">
                <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                    className="w-5 h-5 rounded border-blue-300 text-blue-600"
                />
                <div>
                    <p className="text-sm font-semibold text-blue-900">Tự động tạo tài khoản</p>
                    <p className="text-xs text-blue-700">Hệ thống sẽ tạo tài khoản cho các sinh viên mới trong file</p>
                </div>
            </label>
        </ImportModal>
    );
}