import { GrammaticalGender } from '../../shared/presentation/grammatical-copy';

export interface AuthenticatedUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  roles: UserRole[];
  permissions: Permission[];
  grammatical_gender?: GrammaticalGender;
}

export type Permission =
  | 'records.read.own'
  | 'records.read.assigned'
  | 'academic.read.global'
  | 'tutoring.create'
  | 'users.role.assign'
  | 'students.create'
  | 'semesters.manage'
  | 'committee.manage';

export type UserRole =
  | 'STUDENT'
  | 'TUTOR'
  | 'COMMITTEE_MEMBER'
  | 'PROGRAM_COORDINATOR'
  | 'SYSTEM_ADMIN';

export const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: 'Estudiante',
  TUTOR: 'Asesor / Tutor',
  COMMITTEE_MEMBER: 'Miembro del comité',
  PROGRAM_COORDINATOR: 'Coordinador del programa',
  SYSTEM_ADMIN: 'Administrador del sistema',
};

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: AuthenticatedUser;
}

export interface RoleAssignment {
  role: UserRole;
}
