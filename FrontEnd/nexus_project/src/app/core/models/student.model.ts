import { User } from './user.model';

export type StudentStatus = 'ACTIVO' | 'BAJA_TEMPORAL' | 'BAJA_DEFINITIVA' | 'GRADUADO' | 'EGRESADO';

export interface AcademicCommitteeMember {
  id: number;
  user: User;
  roleInCommittee: 'ASESOR_PRINCIPAL' | 'COASESOR' | 'SECRETARIO' | 'VOCAL' | 'SUPLENTE';
  roleLabel: string;
  isMainAdvisor: boolean;
  isCoAdvisor: boolean;
  assignedDate: string;
}

export interface Semester {
  id: number;
  student?: number;
  numero?: number;
  number?: number;
  name?: string;
  code?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  startDate?: string;
  endDate?: string;
  is_active?: boolean;
  isCurrent?: boolean;
  status?: 'PENDIENTE' | 'EN_CURSO' | 'CONCLUIDO';
  objectives?: string[];
  plannedMilestones?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Student {
  id: number;
  user?: User | null;
  userId?: number;
  matricula: string;
  nombre_completo?: string;
  fullName?: string;
  programa_doctoral?: string;
  program?: string;
  cohorte?: string;
  cohort?: string;
  estatus_activo?: boolean;
  currentSemester?: number;
  status?: StudentStatus;
  researchLine?: string;
  thesisTitle?: string;
  enrollmentDate?: string;
  expectedGraduationDate?: string;
  semesters?: Semester[];
  total_semesters?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StudentDetail extends Student {
  semesters: Semester[];
  committee?: AcademicCommitteeMember[];
  mainAdvisor?: AcademicCommitteeMember;
  coAdvisor?: AcademicCommitteeMember;
  thesisProgressPercent?: number;
  totalAgreements?: number;
  pendingAgreements?: number;
  overdueAgreements?: number;
  concludedAgreements?: number;
  totalTutoringSessions?: number;
  lastTutoringDate?: string;
}

export interface StudentCreateRequest {
  matricula: string;
  nombre_completo: string;
  programa_doctoral?: string;
  cohorte: string;
  estatus_activo?: boolean;
  user?: number | null;
}

export interface StudentCreateResponse {
  student_created_id: number;
  mensaje: string;
  student?: Student;
}

export interface SemesterCreateRequest {
  numero: number;
  fecha_inicio: string;
  fecha_fin: string;
  is_active?: boolean;
}

export interface SemesterCreateResponse {
  semester_created_id: number;
  mensaje: string;
  semester?: Semester;
}

export interface DeleteResponse {
  details: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
