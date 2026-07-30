'use client';
import { usePathname } from 'next/navigation';
import { User } from '@/types';

interface HeaderProps {
  user: User;
}

/** Map prefix → tiêu đề trang hiển thị trên Header */
const PAGE_TITLES: Record<string, string> = {
  '/admin/users':       'Quản lý người dùng',
  '/admin/attendance':  'Điểm danh',
  '/admin':             'Tổng quan',
  '/lecturer/schedule': 'Lịch dạy',
  '/lecturer/attendance': 'Điểm danh',
  '/student/grades':    'Kết quả học tập',
  '/student/attendance':'Điểm danh',
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
    <header className="flex items-center justify-between h-16 pl-12 pr-6 bg-white border-b border-slate-200/70 shrink-0">
      <h1 className="text-base font-medium text-slate-900">{title}</h1>

      <div className="flex items-center gap-3">

        {/* User info */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 hidden sm:block">{user.email}</span>
        </div>
      </div>
    </header>
  );
}