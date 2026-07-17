'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { MenuItem, User } from '@/types';
import { cn, getInitials } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
// Import thêm IconChevronLeft
import { IconChevronRight, IconChevronLeft, IconLogout } from '@tabler/icons-react';

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
  
  // State quản lý việc đóng/mở sidebar
  const [isCollapsed, setIsCollapsed] = useState(false);

  function toggleGroup(href: string) {
    // Tự động mở rộng sidebar nếu đang đóng mà người dùng click vào một nhóm menu
    if (isCollapsed) setIsCollapsed(false);
    
    setOpenGroups((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
    );
  }

  function isActive(href: string) {
    // Nếu là trang Dashboard (chỉ có 1 cấp như /admin, /lecturer, /student)
    // thì phải khớp chính xác tuyệt đối (exact match)
    const isRootLevel = href === `/${user.role}`;
    
    if (isRootLevel) {
      return pathname === href;
    }
    
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside
      className={cn(
        'flex flex-col shrink-0 h-screen bg-white border-r border-slate-200/70 relative transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-0 border-r-0' : 'w-60' // Đổi chiều rộng dựa trên state
      )}
    >
      {/* Nút Toggle ẩn/hiện */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-900 hover:border-slate-300 shadow-sm transition-all",
          isCollapsed ? "-right-8" : "-right-3"
        )}
        aria-label="Thu gọn sidebar"
      >
        {isCollapsed ? (
          <IconChevronRight className="w-4 h-4" />
        ) : (
          <IconChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Logo */}
      <div 
        className={cn(
          'flex items-center h-16 border-b border-slate-100 transition-all overflow-hidden whitespace-nowrap',
          isCollapsed ? 'px-0 opacity-0' : 'gap-2.5 px-5 opacity-100'
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">E</span>
        </div>
        {!isCollapsed && (
          <span className="font-semibold text-slate-900 tracking-tight whitespace-nowrap overflow-hidden">
            EduAttend
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-0.5 custom-scrollbar transition-all", isCollapsed ? "px-0 opacity-0 pointer-events-none" : "px-3 opacity-100")}>
        {menuItems.map((item) =>
          item.children ? (
            <div key={item.href}>
              <button
                onClick={() => toggleGroup(item.href)}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  'w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors [&>svg]:w-5 [&>svg]:h-5 [&>svg]:shrink-0',
                  isCollapsed ? 'justify-center' : 'gap-2.5',
                  isActive(item.href)
                    ? 'text-slate-900 bg-slate-100'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
                )}
              >
                {item.icon}
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left whitespace-nowrap overflow-hidden">
                      {item.label}
                    </span>
                    <IconChevronRight
                      className={cn(
                        'transition-transform w-4 h-4 shrink-0',
                        openGroups.includes(item.href) && 'rotate-90',
                      )}
                      aria-hidden="true"
                    />
                  </>
                )}
              </button>
              {/* Chỉ render menu con khi KHÔNG bị thu gọn */}
              {openGroups.includes(item.href) && !isCollapsed && (
                <div className="ml-8 mt-0.5 space-y-0.5 overflow-hidden">
                  {item.children.map((child) => (
                    <SidebarLink 
                      key={child.href} 
                      item={child} 
                      active={isActive(child.href)} 
                      isCollapsed={isCollapsed} 
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <SidebarLink 
              key={item.href} 
              item={item} 
              active={isActive(item.href)} 
              isCollapsed={isCollapsed} 
            />
          ),
        )}
      </nav>

      {/* User card */}
      <div className={cn("pb-4 border-t border-slate-100 pt-3 transition-all overflow-hidden", isCollapsed ? "px-0 opacity-0 pointer-events-none" : "px-3 opacity-100")}>
        <div 
          className={cn(
            'flex rounded-lg transition-all',
            isCollapsed ? 'flex-col items-center gap-3 py-2' : 'items-center gap-2.5 px-3 py-2'
          )}
        >
          <div
            title={isCollapsed ? user.name : undefined}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 cursor-default',
              ROLE_STYLE[user.role],
            )}
          >
            {getInitials(user.name)}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-400">{ROLE_LABEL[user.role]}</p>
            </div>
          )}
          <button
            onClick={logout}
            title={isCollapsed ? "Đăng xuất" : undefined}
            className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
            aria-label="Đăng xuất"
          >
            <IconLogout className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

// Cập nhật lại SidebarLink để nhận thêm prop isCollapsed
function SidebarLink({ item, active, isCollapsed }: { item: MenuItem; active: boolean; isCollapsed: boolean }) {
  return (
    <Link
      href={item.href}
      title={isCollapsed ? item.label : undefined}
      className={cn(
        'flex items-center px-3 py-2 rounded-lg text-sm transition-colors [&>svg]:w-5 [&>svg]:h-5 [&>svg]:shrink-0',
        isCollapsed ? 'justify-center' : 'gap-2.5',
        active
          ? 'bg-slate-900 text-white'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
      )}
    >
      {item.icon}
      {!isCollapsed && (
        <span className="whitespace-nowrap overflow-hidden text-ellipsis">
          {item.label}
        </span>
      )}
    </Link>
  );
}