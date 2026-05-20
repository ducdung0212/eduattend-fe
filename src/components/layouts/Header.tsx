'use client';
import { usePathname } from 'next/navigation';
import { User } from '@/types';

interface HeaderProps {
  user: User;
}

/** Map prefix → tiêu đề trang hiển thị trên Header */
const PAGE_TITLES: Record<string, string> = {
  '/admin/users':       'Quản lý người dùng',
  '/admin/courses':     'Quản lý khóa học',
  '/admin/attendance':  'Điểm danh',
  '/admin/reports':     'Báo cáo',
  '/admin/settings':    'Cài đặt',
  '/admin':             'Tổng quan',
  '/lecturer/courses':  'Khóa học của tôi',
  '/lecturer/grades':   'Nhập điểm',
  '/lecturer/schedule': 'Lịch dạy',
  '/lecturer/attendance': 'Điểm danh',
  '/lecturer':          'Tổng quan',
  '/student/grades':    'Kết quả học tập',
  '/student/attendance':'Điểm danh',
  '/student/schedule':  'Thời khóa biểu',
  '/student/materials': 'Tài liệu',
  '/student':           'Tổng quan',
};

function resolveTitle(pathname: string): string {
  // Khớp prefix dài nhất
  const match = Object.keys(PAGE_TITLES)
    .filter((k) => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLES[match] : 'EduAttend';
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const title = resolveTitle(pathname);

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200/70 shrink-0">
      <h1 className="text-base font-medium text-slate-900">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          aria-label="Thông báo"
        >
          <i className="ti ti-bell text-lg" aria-hidden="true" />
        </button>

        {/* User info */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 hidden sm:block">{user.email}</span>
        </div>
      </div>
    </header>
  );
}