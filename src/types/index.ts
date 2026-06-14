import { User } from 'next-auth';

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
export type AttendanceMethod='qr_code'|'face';
export type RekognitionResult='match'|'not_match'|'unknown'

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
export interface Subject {
  subject_code: string;
  name: string;
}
export interface Student {
  student_code: string;
  last_name: string;
  first_name: string;
  email: string;
  phone:string;
  class: Class;
  user:User;
}
export interface Lecturer {
  lecturer_code: string;
  last_name: string;
  first_name: string;
  email: string;
  phone: string;
  faculty: Faculty;
  user:User;
}

export interface Room {
  room_code: string;
  name: string;
  capacity: number;
}

export interface ExamSchedule {
  id: string;
  subject: Subject;
  group: number;
  start_time: Date;
  duration: number;
  room: Room;
  note: string;
}

export interface AttendanceRecord{
  id:string;
  student: Student;
  attendance_method:AttendanceMethod;
  rekognition_result:RekognitionResult;
  confidence:number;
  attendance_time:Date;
  exam_schedule_id:string;
}

export interface ExamSupervisor{
  id:string;
  lecturer:Lecturer;
  exam_schedule_id:string;
}