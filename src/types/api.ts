export interface ApiResponse<T = any> {
  status: number;
  message: string;
  data: T | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'lecturer' | 'student';
}

export interface LoginResponse {
  access_token: string;
  user: User;
}