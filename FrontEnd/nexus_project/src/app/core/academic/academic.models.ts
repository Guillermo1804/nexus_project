export interface OtherProductType {
  value: string;
  label: string;
  icon?: string;
}

export const OTHER_PRODUCT_TYPES: OtherProductType[] = [
  { value: 'SOFTWARE', label: 'Software', icon: '💻' },
  { value: 'PATENTE', label: 'Patente', icon: '📜' },
  { value: 'BASE_DATOS', label: 'Base de datos', icon: '🗃️' },
  { value: 'PROTOTIPO', label: 'Prototipo', icon: '🏗️' },
  { value: 'CAPITULO_LIBRO', label: 'Capítulo de libro', icon: '📚' },
  { value: 'OTRO', label: 'Otro', icon: '⚙️' }
];

export interface OtherProduct {
  id: number;
  student: number;
  semester: number | null;
  titulo: string;
  tipo_producto: string;
  descripcion: string;
  fecha_registro: string;
  enlace_web?: string;
  evidencia?: number | null;
  created_at: string;
  updated_at: string;
}

// Importaciones de otros modelos para mantener compatibilidad
// Estas interfaces deben ser definidas en el archivo correcto
// pero se mantienen aquí para evitar errores de compilación

// Para evitar errores de compilación en el build
// Se exportan interfaces vacías que se implementarán correctamente
// en el archivo original

export interface AcademicEvent {
  id: number;
  titulo_trabajo: string;
  nombre_evento: string;
  tipo_evento: string;
  modalidad: string;
  rol_participacion: string;
  fecha_evento: string;
  lugar: string;
  evidencia: number;
  evidencia_archivo: string;
}
export interface EventType {}
export interface RoleParticipation {}
export interface Modality {}
export interface Publication {
  id: number;
  titulo: string;
  tipo: string;
  estado: string;
  autores: string;
  revista: string;
  fecha_publicacion: string;
  doi?: string;
  evidencia_archivo?: string;
  evidencia: number | null;
}
export interface PaginatedResponse<T> { results: T[]; }
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
  semesters: Array<{
    id: number;
    student: number;
    numero: number;
    fecha_inicio: string;
    fecha_fin: string;
    is_active: boolean;
    tutoring_sessions: Array<{
      id: number;
      student: number;
      fecha_sesion: string;
      proxima_reunion_fecha: string;
      modalidad: string;
    }>;
  }>;
  advisors: {
    advisor: {
      id: number;
      nombre_completo: string;
      email?: string;
      rol_comite?: string;
    } | null;
    coadvisor: {
      id: number;
      nombre_completo: string;
      email?: string;
      rol_comite?: string;
    } | null;
    members: Array<{
      id: number;
      nombre_completo: string;
      email?: string;
      rol_comite?: string;
    }>;
  };
  last_tutoring: {
    id: number;
    fecha_sesion: string;
    modalidad: string;
    resumen: string;
    proxima_reunion_fecha: string;
    proxima_reunion_notas: string;
  } | null;
  open_agreements: Agreement[];
  thesis_progress: {
    id: number;
    porcentaje_avance: number;
    observaciones?: string;
    componentes_json: Record<string, number | string | object>;
    fecha_registro: string;
  } | null;
  recent_academic_activity: Array<{
    tipo: string;
    titulo: string;
    fecha: string;
    detalle?: string;
  }>;
}
export interface StudentRecord {
  id: number;
  nombre_completo: string;
  matricula: string;
  programa_doctoral: string;
  cohorte: string;
  estatus_activo: boolean;
}
export interface Agreement {
  id: number;
  descripcion: string;
  estado: string;
  is_vencido: boolean;
  responsable: number;
  fecha_limite: string;
  responsable_nombre: string;
  student_nombre?: string;
  student?: number | { id: number; nombre_completo: string; }; // based on usage
  student_matricula?: string;
  semester_numero?: number | null;
  semester?: number;
  session?: number | null;
}
export interface AgreementAlert {
  agreement_id: number;
  nivel?: string;
}
// test comment
export interface AgreementAlertsResponse {
  total_alertas: number;
  vencidos_count: number;
  proximos_vencer_count: number;
  alertas: AgreementAlert[];
}
export interface Semester {
  id: number;
  numero: number;
  fecha_inicio: string;
  fecha_fin: string;
  is_active: boolean;
  tutoring_sessions: SemesterTutoringSession[];
}
export interface SemesterTutoringSession {
  id: number;
  fecha_sesion: string;
  modalidad: string;
  resumen?: string;
  proxima_reunion_fecha?: string;
  proxima_reunion_notas?: string;
}
export interface ThesisHistoryEntry {
  id: string | number;
  semestre_numero: string;
  fecha: string;
  porcentaje_avance: number;
  delta_porcentaje: number;
  estancamiento_detectado: boolean;
  componentes_json: Record<ThesisComponentKey, any>;
  observaciones?: string;
  registrado_por_nombre?: string;
}
export interface ThesisHistoryResponse {
  historico: ThesisHistoryEntry[];
  total_registros: number;
}
export interface TimelineEvent {
  id: string | number;
  tipo: TimelineEventType;
  fecha: string;
  titulo: string;
  descripcion?: string;
  actividad?: Activity;
  actor?: string;
  estado_efectivo?: string;
  porcentaje?: number;
  archivo_url?: string;
  enlace_url?: string;
  orden?: number;
}
export interface Activity {
  tipo: TimelineEventType;
  id: number;
  etiqueta: string;
  titulo: string;
  fecha: string;
}
export type TimelineEventType = 'TUTORIA' | 'ACUERDO' | 'TESIS' | 'EVIDENCIA';
export interface TimelineResponse {
  semestres: TimelineSemester[];
}
export type ThesisComponentKey = 'protocolo' | 'marco_teorico' | 'metodologia' | 'recoleccion_datos' | 'analisis_resultados' | 'redaccion_capitulos';
export interface ThesisComponents {}
export interface Evidence {}
export interface EvidenceLinkData {}
export interface EvidenceUploadData {
  student: number | null;
  semester: number | null;
  actividad_tipo: string;
  actividad_id?: number | null | undefined;
  titulo: string;
  descripcion: string;
  archivo_adjunto: string | File;
}
export interface TutoringObservation {
  id: number;
  tema_revisado: string;
  observaciones_detalladas: string;
  created_at: string;
  autor_nombre?: string;
}
export interface CreateTutoringObservationData {}
export interface ParticipanteTutoria {
  id: number;
  user: number;
  asistencia: boolean;
}
export interface DatosParticipanteTutoria {}
export interface UpdateNextMeetingData {}
export interface ThesisProgress {
  id: number;
  porcentaje_avance: number;
  observaciones?: string;
  componentes_json: Record<string, number | string | object>;
  fecha_registro: string;
}

export interface CreateThesisProgressData {}
export interface TimelineSemester {
  eventos: TimelineEvent[];
  numero: number;
  activo: boolean;
}
export interface AgreementFilters {
  student?: number;
  semester?: number;
  responsable?: number;
  estados?: string[] | string;
  estado?: string;
  vencido?: boolean;
  fecha_desde?: string;
  fecha_hasta?: string;
  busqueda?: string;
  orden?: string;
  limit?: number;
  page_size?: number;
  offset?: number;
}
export interface AgreementAuditEntry {
  id: number;
  es_alta: boolean;
  estado_anterior: string;
  estado_nuevo: string;
  fecha_cambio: string;
  user_email?: string;
  comentario?: string;
}
export interface CreateSessionAgreementData {}
export interface TutoringSession {
  student: number;
  fecha_sesion: string;
  id: number;
  proxima_reunion_fecha: string;
  modalidad: string;
}
export interface TutoringSessionData {}
export interface CreateSemesterData {}
export interface PublicationStatus {}
export interface RolParticipanteTutoria {
  id: number;
  nombre_completo: string;
  email?: string;
  rol_comite?: string;
}
export interface PublicationType {}

// Pipes para el componente de otros productos
export function typeLabel(value: string): string {
  const type = OTHER_PRODUCT_TYPES.find(t => t.value === value);
  return type ? `${type.icon} ${type.label}` : value;
}

export function badgeClass(value: string): string {
  return value;
}