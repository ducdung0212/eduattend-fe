export type Role = 'admin' | 'lecturer' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  lecturer_code?:string;
  student_code?:string;
  created_at: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginFacePayload {
  imageBase64: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}