import { MenuItem, Role } from '@/types';
import { 
  IconChartBar, 
  IconUsers, 
  IconCalendarCheck, 
  IconFileAnalytics, 
  IconSettings, 
  IconBook, 
  IconBookmark, 
  IconPencil, 
  IconCalendar, 
  IconSchool, 
  IconFile 
} from '@tabler/icons-react';

const MENU_MAP: Record<Role, MenuItem[]> = {
  admin: [
    { label: 'Dashboard',      href: '/admin',                icon: <IconChartBar /> },
    { 
      label: 'Quản lý người dùng',
      href: '/admin/users',
      icon: <IconUsers />
     },
    { 
      label: 'Quản lý danh mục',
      href: '/admin/falcuties',
      icon: <IconUsers />,
      children: [
        { label: 'Quản lý khoa',    href: '/admin/faculties',     icon: <IconBookmark /> },
        { label: 'Quản lý lớp', href: '/admin/classes',   icon: <IconCalendarCheck /> },
        { label: 'Quản lý môn học', href: '/admin/subjects',   icon: <IconCalendarCheck /> },
        { label: 'Quản lý sinh viên', href: '/admin/students',   icon: <IconCalendarCheck /> },
        { label: 'Quản lý giảng viên', href: '/admin/lecturers',   icon: <IconCalendarCheck /> },
      ],
     },
  ],

  lecturer: [
    { label: 'Tổng quan',      href: '/lecturer',             icon: <IconChartBar /> },
    {
      label: 'Khóa học',
      href: '/lecturer/courses',
      icon: <IconBook />,
      children: [
        { label: 'Của tôi',    href: '/lecturer/courses',     icon: <IconBookmark /> },
        { label: 'Điểm danh', href: '/lecturer/attendance',   icon: <IconCalendarCheck /> },
      ],
    },
    { label: 'Nhập điểm',      href: '/lecturer/grades',      icon: <IconPencil /> },
    { label: 'Lịch dạy',       href: '/lecturer/schedule',    icon: <IconCalendar /> },
  ],

  student: [
    { label: 'Điểm danh',         href: '/student/attendance',   icon: <IconCalendarCheck /> },
    { label: 'Thời khóa biểu',    href: '/student/schedule',     icon: <IconCalendar /> },
    { label: 'Tài liệu',          href: '/student/materials',    icon: <IconFile /> },
  ],
};

export function getMenuByRole(role: Role): MenuItem[] {
  return MENU_MAP[role] ?? [];
}