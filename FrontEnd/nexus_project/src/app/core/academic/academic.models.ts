import { UserRole } from '../auth/auth.models';

export interface StudentRecord {
  id: number;
  matricula: string;
  nombre_completo: string;
  programa_doctoral: string;
  cohorte: string;
  estatus_activo: boolean;
}

export interface TutoringSessionData {
  student: number;
  semester: number;
  fecha_sesion: string;
  modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA';
  resumen: string;
  proxima_reunion_fecha?: string;
  proxima_reunion_notas?: string;
}

export interface TutoringSession extends TutoringSessionData {
  id: number;
  created_by: number;
}

export interface Semester {
  id: number;
  student: number;
  numero: number;
  fecha_inicio: string;
  fecha_fin: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSemesterData {
  numero: number;
  fecha_inicio: string;
  fecha_fin: string;
  is_active?: boolean;
}

export interface StudentOverview {
  id: number;
  matricula: string;
  nombre_completo: string;
  programa_doctoral: string;
  cohorte: string;
  estatus_activo: boolean;
  student: {
    id: number;
    matricula: string;
    nombre_completo: string;
    programa_doctoral: string;
    cohorte: string;
    fecha_ingreso: string;
    estatus_activo: boolean;
  };
  current_semester: {
    id: number;
    numero: number;
    fecha_inicio: string;
    fecha_fin: string;
    is_active: boolean;
  } | null;
  semesters: Semester[];
  advisors: {
    advisor: { id: number; nombre_completo: string; email: string; rol_comite: string } | null;
    coadvisor: { id: number; nombre_completo: string; email: string; rol_comite: string } | null;
    members: { id: number; nombre_completo: string; email: string; rol_comite: string }[];
  };
  last_tutoring: {
    id: number;
    fecha_sesion: string;
    modalidad: string;
    resumen: string;
    proxima_reunion_fecha?: string | null;
    proxima_reunion_notas?: string;
  } | null;
  open_agreements: {
    id: number;
    descripcion: string;
    fecha_limite: string;
    estado: string;
    responsable_nombre: string;
    is_vencido: boolean;
  }[];
  thesis_progress: {
    porcentaje_avance: number;
    observaciones: string;
    componentes_json?: Record<string, any>;
    fecha_registro: string | null;
  };
  recent_academic_activity: {
    tipo: string;
    titulo: string;
    fecha: string;
    detalle: string;
  }[];
}

export type AcademicRole = UserRole;