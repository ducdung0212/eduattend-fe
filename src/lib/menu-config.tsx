import { MenuItem, Role } from '@/types';
import {
  IconLayoutDashboard,
  IconUsers,
  IconFolders,
  IconBuildingCommunity,
  IconChalkboard,
  IconBooks,
  IconDoor,
  IconIdBadge2,
  IconTie,
  IconCalendarTime,
  IconClipboardCheck,
  IconFaceId,
  IconCalendarEvent,
} from '@tabler/icons-react';

const MENU_MAP: Record<Role, MenuItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/admin', icon: <IconLayoutDashboard /> },
    {
      label: 'Quản lý người dùng',
      href: '/admin/users',
      icon: <IconUsers />
    },
    {
      label: 'Quản lý danh mục',
      href: '/admin/falcuties', // Lưu ý: Chữ 'falcuties' đang bị sai chính tả (faculties), bạn nên check lại router nhé
      icon: <IconFolders />,
      children: [
        { label: 'Quản lý khoa', href: '/admin/faculties', icon: <IconBuildingCommunity /> },
        { label: 'Quản lý lớp', href: '/admin/classes', icon: <IconChalkboard /> },
        { label: 'Quản lý môn học', href: '/admin/subjects', icon: <IconBooks /> },
        { label: 'Quản lý phòng', href: '/admin/rooms', icon: <IconDoor /> },
        { label: 'Quản lý sinh viên', href: '/admin/students', icon: <IconIdBadge2 /> },
        { label: 'Quản lý giảng viên', href: '/admin/lecturers', icon: <IconTie /> },
      ],
    },
    {
      label: 'Quản lý thi cử',
      href: '/admin/exam-schedules', // Lưu ý: Chữ 'falcuties' đang bị sai chính tả (faculties), bạn nên check lại router nhé
      icon: <IconCalendarTime />,
      children: [
        { label: 'Quản lý ca thi', href: '/admin/exam-schedules', icon: <IconCalendarTime /> },
        { label: 'Điểm danh', href: '/admin/attendances', icon: <IconClipboardCheck /> },
        { label: 'Đăng ký khuôn mặt ', href: '/lecturer/registration-face', icon: <IconFaceId /> },
      ],
    },
  ],

  lecturer: [
    { label: 'Điểm danh', href: '/lecturer/attendances', icon: <IconClipboardCheck /> },
    { label: 'Lịch gác thi', href: '/lecturer/schedules', icon: <IconCalendarEvent /> },
  ],

  student: [
    { label: 'Lịch thi', href: '/student/exam-schedules', icon: <IconCalendarTime /> },
  ],
};

export function getMenuByRole(role: Role): MenuItem[] {
  return MENU_MAP[role] ?? [];
}