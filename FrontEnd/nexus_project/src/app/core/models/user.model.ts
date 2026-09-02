export type UserRole = 'ADMIN' | 'COORDINADOR' | 'ASESOR' | 'COASESOR' | 'COMITE' | 'ESTUDIANTE';

export interface User {
  id: number;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  full_name?: string;
  role: UserRole;
  student_id?: number;
  studentId?: number;
  isActive?: boolean;
  is_active?: boolean;
  isStaff?: boolean;
  is_staff?: boolean;
  institution?: string;
  department?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
}

export interface TokenRefreshResponse {
  access: string;
  refresh?: string;
}
