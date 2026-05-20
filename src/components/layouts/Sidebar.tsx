'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { MenuItem, User } from '@/types';
import { cn, getInitials } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { IconChevronRight, IconLogout } from '@tabler/icons-react';

interface SidebarProps {
  menuItems: MenuItem[];
  user: User;
}

const ROLE_STYLE: Record<string, string> = {
  admin:    'bg-red-50 text-red-700',
  lecturer: 'bg-blue-50 text-blue-700',
  student:  'bg-green-50 text-green-700',
};

const ROLE_LABEL: Record<string, string> = {
  admin:    'Admin',
  lecturer: 'Giảng viên',
  student:  'Sinh viên',
};

export function Sidebar({ menuItems, user }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  function toggleGroup(href: string) {
    setOpenGroups((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
    );
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside className="flex flex-col w-60 shrink-0 h-screen bg-white border-r border-slate-200/70">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center">
          <span className="text-white text-xs font-bold">E</span>
        </div>
        <span className="font-semibold text-slate-900 tracking-tight">EduAttend</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {menuItems.map((item) =>
          item.children ? (
            <div key={item.href}>
              <button
                onClick={() => toggleGroup(item.href)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors [&>svg]:w-5 [&>svg]:h-5',
                  isActive(item.href)
                    ? 'text-slate-900 bg-slate-100'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
                )}
              >
                {/* Icon từ React Component */}
                {item.icon}
                <span className="flex-1 text-left">{item.label}</span>
                <IconChevronRight
                  className={cn(
                    'transition-transform w-4 h-4',
                    openGroups.includes(item.href) && 'rotate-90',
                  )}
                  aria-hidden="true"
                />
              </button>
              {openGroups.includes(item.href) && (
                <div className="ml-8 mt-0.5 space-y-0.5">
                  {item.children.map((child) => (
                    <SidebarLink key={child.href} item={child} active={isActive(child.href)} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
          ),
        )}
      </nav>

      {/* User card */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
              ROLE_STYLE[user.role],
            )}
          >
            {getInitials(user.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-400">{ROLE_LABEL[user.role]}</p>
          </div>
          <button
            onClick={logout}
            className="text-slate-400 hover:text-red-500 transition-colors"
            aria-label="Đăng xuất"
          >
            <IconLogout className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: MenuItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors [&>svg]:w-5 [&>svg]:h-5',
        active
          ? 'bg-slate-900 text-white'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
      )}
    >
      {/* Icon từ React Component */}
      {item.icon}
      {item.label}
    </Link>
  );
}