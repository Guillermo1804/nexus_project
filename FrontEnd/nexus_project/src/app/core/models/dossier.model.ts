export interface DossierUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'COORDINADOR' | 'ASESOR' | 'ESTUDIANTE';
}

export interface DossierStudent {
  id: number;
  matricula: string;
  nombre_completo: string;
  programa_doctoral: string;
  cohorte: string;
  estatus_activo: boolean;
  created_at: string;
  user?: DossierUser;
}

export interface DossierCommitteeMember {
  id: number;
  user: DossierUser;
  rol_comite: 'ASESOR_PRINCIPAL' | 'COASESOR' | 'VOCAL' | 'SECRETARIO';
  rol_comite_display: string;
  fecha_asignacion: string;
  is_active: boolean;
}

export interface DossierSemester {
  id: number;
  numero: number;
  fecha_inicio: string;
  fecha_fin: string;
  is_active: boolean;
}

export interface DossierTutoringParticipant {
  id: number;
  user_id: number;
  user_nombre: string;
  user_email: string;
  user_role: string;
  rol_en_sesion: string;
  rol_en_sesion_display: string;
  asistencia: boolean;
  notas: string;
}

export interface DossierTutoringObservation {
  id: number;
  autor_id: number;
  autor_nombre: string;
  autor_email: string;
  titulo_tema: string;
  contenido: string;
  created_at: string;
}

export interface DossierTutoringSession {
  id: number;
  semester_id: number;
  semester_numero: number;
  fecha_sesion: string;
  modalidad: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA';
  modalidad_display: string;
  resumen: string;
  proxima_reunion_fecha?: string | null;
  proxima_reunion_notas?: string;
  created_by_id?: number;
  created_by_nombre?: string;
  created_at: string;
  participants: DossierTutoringParticipant[];
  observations: DossierTutoringObservation[];
}

export interface DossierAgreementAuditLog {
  id: number;
  user_id?: number;
  user_nombre?: string;
  estado_anterior: string;
  estado_nuevo: string;
  comentario: string;
  fecha_cambio: string;
}

export interface DossierEvidenceSimple {
  id: number;
  titulo: string;
  tipo: 'ARCHIVO_LOCAL' | 'ENLACE_DOI';
  tipo_display: string;
  actividad_tipo: string;
  actividad_tipo_display: string;
  actividad_id?: number;
  archivo_adjunto_url?: string | null;
  enlace_url?: string;
  mime_type?: string;
  file_size_bytes: number;
  fecha_carga: string;
}

export interface DossierAgreement {
  id: number;
  session_id?: number | null;
  session_fecha?: string | null;
  descripcion: string;
  responsable_id: number;
  responsable_nombre: string;
  responsable_email: string;
  fecha_limite: string;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'CONCLUIDO' | 'VENCIDO';
  estado_display: string;
  fecha_conclusion?: string | null;
  is_vencido: boolean;
  created_at: string;
  audit_logs: DossierAgreementAuditLog[];
  evidences: DossierEvidenceSimple[];
}

export interface DossierThesisProgress {
  id: number;
  semester_id: number;
  semester_numero: number;
  porcentaje_avance: number;
  componentes_json: Record<string, number>;
  observaciones?: string;
  fecha_registro: string;
  created_at: string;
}

export interface DossierPublication {
  id: number;
  semester_id?: number | null;
  semester_numero?: number | null;
  titulo: string;
  autores_texto: string;
  tipo: string;
  tipo_display: string;
  revista_editorial: string;
  estado: string;
  estado_display: string;
  fecha_publicacion?: string | null;
  doi_url?: string;
  evidencia?: DossierEvidenceSimple | null;
  created_at: string;
}

export interface DossierAcademicEvent {
  id: number;
  semester_id?: number | null;
  semester_numero?: number | null;
  tipo_evento: string;
  tipo_evento_display: string;
  nombre_evento: string;
  titulo_ponencia: string;
  fecha_presentacion: string;
  sede_lugar: string;
  modalidad: string;
  modalidad_display: string;
  evidencia?: DossierEvidenceSimple | null;
  created_at: string;
}

export interface DossierResearchStay {
  id: number;
  institucion_receptora: string;
  pais: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_dias?: number;
  responsable_estancia: string;
  objetivos: string;
  resultados: string;
  evidencia?: DossierEvidenceSimple | null;
  created_at: string;
}

export interface DossierOtherProduct {
  id: number;
  tipo_producto: string;
  tipo_producto_display: string;
  titulo: string;
  descripcion: string;
  fecha_registro: string;
  evidencia?: DossierEvidenceSimple | null;
  created_at: string;
}

export interface DossierEvidence {
  id: number;
  semester_id?: number | null;
  semester_numero?: number | null;
  tipo: string;
  tipo_display: string;
  actividad_tipo: string;
  actividad_tipo_display: string;
  actividad_id?: number | null;
  titulo: string;
  descripcion: string;
  archivo_adjunto_url?: string | null;
  enlace_url?: string;
  mime_type?: string;
  file_size_bytes: number;
  fecha_carga: string;
  created_by_id?: number | null;
  created_by_nombre?: string;
  created_at: string;
}

export interface DossierKPIs {
  total_tutorias: number;
  total_acuerdos: number;
  acuerdos_concluidos: number;
  acuerdos_pendientes: number;
  acuerdos_en_proceso: number;
  acuerdos_vencidos: number;
  tasa_cumplimiento_acuerdos: number;
  ultimo_porcentaje_tesis: number | null;
  ultima_actualizacion_tesis: string | null;
  total_publicaciones: number;
  total_eventos_academicos: number;
  total_estancias_investigacion: number;
  total_otros_productos: number;
  total_evidencias: number;
}

export interface FullDossier {
  student: DossierStudent;
  committee: DossierCommitteeMember[];
  semesters: DossierSemester[];
  tutoring_sessions: DossierTutoringSession[];
  agreements: DossierAgreement[];
  thesis_progress: DossierThesisProgress[];
  publications: DossierPublication[];
  academic_events: DossierAcademicEvent[];
  research_stays: DossierResearchStay[];
  other_products: DossierOtherProduct[];
  evidences: DossierEvidence[];
  kpis: DossierKPIs;
  generated_at: string;
  generated_by: DossierUser;
}
