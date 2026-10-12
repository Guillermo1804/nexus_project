import { UserRole } from '../core/auth/auth.models';
import { StudentRecord } from '../core/academic/academic.models';
import { GrammaticalGender } from '../shared/presentation/grammatical-copy';

export type InstitutionalRole = 'TUTOR' | 'COMMITTEE_MEMBER' | 'PROGRAM_COORDINATOR';

export interface InstitutionalUserCreate {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: InstitutionalRole;
  grammatical_gender?: GrammaticalGender;
}

export type CommitteeRole = 'ASESOR' | 'COASESOR' | 'COMMITTEE_MEMBER';

export interface CommitteeMembership {
  id: number;
  user: number;
  user_email: string;
  role: CommitteeRole;
}

export interface AcademicCommittee {
  id: number;
  student: number;
  student_name: string;
  memberships: CommitteeMembership[];
}

export const COMMITTEE_ROLE_LABELS: Record<CommitteeRole, string> = {
  ASESOR: 'Asesor',
  COASESOR: 'Coasesor',
  COMMITTEE_MEMBER: 'Miembro del comité',
};

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