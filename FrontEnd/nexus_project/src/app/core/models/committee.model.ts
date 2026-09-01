import { User } from './user.model';

export type CommitteeRole = 'ASESOR_PRINCIPAL' | 'COASESOR' | 'VOCAL' | 'SECRETARIO';

export interface AcademicCommitteeMember {
  id: number;
  student: number;
  user: number;
  user_detail?: User;
  userDetail?: User;
  rol_comite: CommitteeRole;
  rol_comite_display?: string;
  fecha_asignacion: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CommitteeAssignRequest {
  student?: number;
  user: number;
  rol_comite: CommitteeRole;
  fecha_asignacion?: string;
  is_active?: boolean;
}

export interface CommitteeAssignResponse {
  committee_member_created_id: number;
  mensaje: string;
  committee_member: AcademicCommitteeMember;
}
