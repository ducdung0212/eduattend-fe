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

// ── Course ──────────────────────────────────────────────────
export interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  lecturerId: string;
  semester: string;
  created_at: string;
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

// ── Grade ────────────────────────────────────────────────────
export interface Grade {
  id: string;
  studentId: string;
  courseId: string;
  midterm?: number;
  final?: number;
  average?: number;
  semester: string;
}