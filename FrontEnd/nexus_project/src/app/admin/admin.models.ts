import { UserRole } from '../core/auth/auth.models';
import { StudentRecord } from '../core/academic/academic.models';

export type InstitutionalRole = Exclude<UserRole, 'STUDENT' | 'SYSTEM_ADMIN'>;

export interface InstitutionalUserCreate {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: InstitutionalRole;
}

export interface CommitteeAssignment {
  id: number;
  user: number;
  user_email: string;
  student: number;
  student_name: string;
  rol_comite: 'ASESOR_PRINCIPAL' | 'COASESOR' | 'VOCAL' | 'SECRETARIO';
  fecha_asignacion: string;
  is_active: boolean;
}

export type AdminStudent = StudentRecord;

export interface AdminAuditLog {
  id: number;
  action: string;
  actor: number;
  actor_email: string;
  target_user: number | null;
  target_user_email: string | null;
  committee_assignment: number | null;
  details: Record<string, string | number | boolean>;
  created_at: string;
}