export interface AuthenticatedUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

export type UserRole =
  | 'STUDENT'
  | 'TUTOR'
  | 'COMMITTEE_MEMBER'
  | 'PROGRAM_COORDINATOR'
  | 'ACADEMIC_ADMIN'
  | 'SYSTEM_ADMIN';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData extends LoginCredentials {
  first_name: string;
  last_name: string;
  matricula: string;
  programa_doctoral: string;
  cohorte: string;
}

export interface LoginResponse extends AuthenticatedUser {
  token: string;
}
