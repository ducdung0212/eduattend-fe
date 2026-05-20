'use client';

import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { X } from 'lucide-react';

export function ToastProvider() {
    return (
        <Toaster
            position="top-right"
            toastOptions={{
                duration: 3000,
                style: {
                    background: '#fff',
                    color: '#363636',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    borderRadius: '8px',
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: 500,
                },
                success: {
                    iconTheme: {
                        primary: '#10b981',
                        secondary: '#fff',
                    },
                },
                error: {
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                    },
                },
            }}
        >
            {(t) => (
                <ToastBar toast={t}>
                    {({ icon, message }) => (
                        <>
                            {icon}
                            {message}
                            {t.type !== 'loading' && (
                                <button
                                    onClick={() => toast.dismiss(t.id)}
                                    className="ml-4 flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X size={16} className="text-gray-400" />
                                </button>
                            )}
                        </>
                    )}
                </ToastBar>
            )}
        </Toaster>
    );
}
