export * from './auth';

// ── Pagination ──────────────────────────────────────────────
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ── API ─────────────────────────────────────────────────────
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// ── Menu ────────────────────────────────────────────────────
export interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** Sub-menu items (optional) */
  children?: MenuItem[];
}


// ── Attendance ───────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  courseId: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
}

// ── Models ───────────────────────────────────────────────────
export interface Faculty {
  faculty_code: string;
  name: string;
}

export interface Class {
  class_code: string;
  name: string;
  faculty: Faculty;
}
export interface Subject{
  subject_code:string;
  name:string;
}
export interface Lecturer{
  lecturer_code:string;
  last_name:string;
  first_name:string;
  email:string;
  phone:string;
  faculty: Faculty;
}