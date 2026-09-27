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

<<<<<<< HEAD
export interface TutoringObservation {
  id: number;
  session: number;
  autor: number;
  autor_nombre: string;
  tema_revisado: string;
  observaciones_detalladas: string;
  created_at: string;
}

export interface CreateTutoringObservationData {
  tema_revisado: string;
  observaciones_detalladas: string;
=======
export interface SemesterTutoringSession {
  id: number;
  fecha_sesion: string;
  modalidad: string;
  resumen: string;
  proxima_reunion_fecha?: string | null;
  proxima_reunion_notas?: string;
>>>>>>> origin/HU-07-registrar-sesion-tutoria
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
  tutoring_sessions: SemesterTutoringSession[];
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
    user_id: number | null;
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
    responsable: number;
    responsable_nombre: string;
    is_vencido: boolean;
  }[];
  thesis_progress: {
    porcentaje_avance: number;
    observaciones: string;
    componentes_json?: Record<string, unknown>;
    fecha_registro: string | null;
  } | null;
  recent_academic_activity: {
    tipo: string;
    titulo: string;
    fecha: string;
    detalle: string;
  }[];
}

export interface Agreement {
  id: number;
  student: number;
  student_nombre?: string;
  student_matricula?: string;
  session: number | null;
  semester?: number | null;
  semester_numero?: number | null;
  descripcion: string;
  responsable: number;
  responsable_nombre: string;
  fecha_limite: string;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'CONCLUIDO' | 'VENCIDO';
  is_vencido: boolean;
}

export interface AgreementFilters {
  page?: number;
  page_size?: number;
  student?: number;
  semester?: number;
  estado?: string;
  responsable?: number;
  vencido?: boolean;
  fecha_limite?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface AgreementAuditEntry {
  id: number;
  user: number | null;
  estado_anterior: string;
  estado_nuevo: string;
  comentario: string;
  fecha_cambio: string;
}

export interface CreateSessionAgreementData {
  descripcion: string;
  responsable: number;
  fecha_limite: string;
}

export interface EvidenceUploadData {
  student: number;
  semester: number | null;
  actividad_tipo: string;
  titulo: string;
  archivo_adjunto: File;
}

export interface Evidence {
  id: number;
  student: number;
  semester: number | null;
  actividad_tipo: string;
  titulo: string;
  mime_type: string;
  file_size_bytes: number;
}

export type AcademicRole = UserRole;