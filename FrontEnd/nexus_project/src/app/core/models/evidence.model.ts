export type EvidenceType = 'ARCHIVO_LOCAL' | 'ENLACE_DOI';
export type EvidenceActivityType = 'TUTORIA' | 'ACUERDO' | 'TESIS' | 'OTRO';

export interface Evidence {
  id: number;
  student: number;
  student_nombre?: string;
  student_matricula?: string;
  semester?: number | null;
  semester_numero?: number | null;
  tipo: EvidenceType;
  tipo_display?: string;
  actividad_tipo: EvidenceActivityType;
  actividad_tipo_display?: string;
  actividad_id?: number | null;
  titulo: string;
  descripcion?: string;
  archivo_adjunto?: string | null;
  archivo_url?: string | null;
  enlace_url?: string;
  mime_type?: string;
  file_size_bytes?: number;
  fecha_carga: string;
  created_by?: number | null;
  created_by_nombre?: string;
  created_at: string;

  // CamelCase aliases
  studentId?: number;
  studentName?: string;
  studentMatricula?: string;
  semesterId?: number | null;
  semesterNumber?: number | null;
  type?: EvidenceType;
  activityType?: EvidenceActivityType;
  activityId?: number | null;
  title?: string;
  description?: string;
  fileUrl?: string | null;
  url?: string;
  doiUrl?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  size?: number;
  uploadDate?: string;
  createdAt?: string;
}

export interface EvidenceCreateResponse {
  evidence_created_id: number;
  mensaje: string;
  evidence: Evidence;
}

export interface EvidenceFilterParams {
  student?: number | string;
  studentId?: number | string;
  actividad_tipo?: EvidenceActivityType;
  actividad_id?: number | string;
  tipo?: EvidenceType;
  semester?: number | string;
  search?: string;
}
