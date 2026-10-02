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

export interface UpdateNextMeetingData {
  proxima_reunion_fecha: string | null;
  proxima_reunion_notas: string;
}

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
}

export type RolParticipanteTutoria =
  | 'ESTUDIANTE'
  | 'ASESOR_PRINCIPAL'
  | 'COASESOR'
  | 'MIEMBRO_COMITE';

export interface ParticipanteTutoria {
  id: number;
  session: number;
  user: number;
  rol_en_sesion: RolParticipanteTutoria;
  asistencia: boolean;
  notas: string;
}

export interface DatosParticipanteTutoria {
  user: number;
  rol_en_sesion: RolParticipanteTutoria;
  asistencia: boolean;
  notas?: string;
}

export interface SemesterTutoringSession {
  id: number;
  fecha_sesion: string;
  modalidad: string;
  resumen: string;
  proxima_reunion_fecha?: string | null;
  proxima_reunion_notas?: string;
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
  tutoring_sessions?: SemesterTutoringSession[];
}

export interface CreateSemesterData {
  numero: number;
  fecha_inicio: string;
  fecha_fin: string;
  is_active?: boolean;
}

export type ThesisComponentKey = 'protocolo' | 'marco_teorico' | 'metodologia' | 'recoleccion_datos' | 'analisis_resultados' | 'redaccion_capitulos';
export type ThesisComponents = Record<ThesisComponentKey, number>;

export interface ThesisProgress {
  id: number;
  student: number;
  semester: number;
  porcentaje_avance: number;
  observaciones: string;
  componentes_json: Partial<ThesisComponents>;
  registrado_por: number | null;
  registrado_por_nombre: string;
  fecha_registro: string;
  created_at: string;
}

export interface CreateThesisProgressData {
  student: number;
  semester: number;
  porcentaje_avance: number;
  observaciones: string;
  componentes_json: ThesisComponents;
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
    id: number;
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
  /** Texto libre sobre la descripción del acuerdo. */
  busqueda?: string;
  /** Campo de ordenamiento; el sufijo `_desc` lo invierte. */
  orden?: string;
}

export interface AgreementAlert {
  agreement_id: number;
  student_id: number;
  student_nombre: string;
  descripcion: string;
  responsable_nombre: string;
  fecha_limite: string;
  nivel: 'CRITICO' | 'ADVERTENCIA';
  dias_retraso?: number;
  dias_restantes?: number;
  mensaje: string;
}

export interface AgreementAlertsResponse {
  total_alertas: number;
  vencidos_count: number;
  proximos_vencer_count: number;
  alertas: AgreementAlert[];
}

export interface AgreementAuditEntry {
  id: number;
  user: number | null;
  user_email: string;
  estado_anterior: string;
  estado_nuevo: string;
  comentario: string;
  fecha_cambio: string;
  /** `true` cuando el movimiento es el alta del acuerdo y no una transición. */
  es_alta: boolean;
}

export interface CreateSessionAgreementData {
  descripcion: string;
  responsable: number;
  fecha_limite: string;
}

interface EvidenceBaseData {
  student: number;
  semester: number | null;
  actividad_tipo: string;
  actividad_id?: number;
  titulo: string;
  descripcion?: string;
}

export interface EvidenceUploadData extends EvidenceBaseData {
  archivo_adjunto: File;
}

export interface EvidenceLinkData extends EvidenceBaseData {
  tipo: 'ENLACE_DOI';
  enlace_url: string;
}

export interface Evidence {
  id: number;
  student: number;
  semester: number | null;
  tipo: 'ARCHIVO_LOCAL' | 'ENLACE_DOI';
  actividad_tipo: string;
  titulo: string;
  descripcion: string;
  archivo_adjunto: string | null;
  enlace_url: string;
  mime_type: string;
  file_size_bytes: number;
}

export type TimelineEventType = 'TUTORIA' | 'ACUERDO' | 'TESIS' | 'EVIDENCIA';

export interface TimelineEvent {
  id: string;
  tipo: TimelineEventType;
  fecha: string;
  /** Secuencia real dentro de su fecha; desempata los eventos que comparten día. */
  orden?: number;
  titulo: string;
  descripcion: string;
  actor?: string;
  estado?: string;
  estado_efectivo?: string;
  fecha_limite?: string;
  porcentaje?: number;
  archivo_url?: string;
  enlace_url?: string;
  metadata: Record<string, string | number | null>;
}

export interface TimelineSemester {
  id: number;
  numero: number;
  activo: boolean;
  eventos: TimelineEvent[];
}

export interface TimelineResponse {
  student: Pick<StudentRecord, 'id' | 'matricula' | 'nombre_completo'>;
  semestres: TimelineSemester[];
}

export type AcademicRole = UserRole;
