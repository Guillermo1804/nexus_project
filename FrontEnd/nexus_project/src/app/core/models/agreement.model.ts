export type AgreementStatus = 'PENDIENTE' | 'EN_PROCESO' | 'CONCLUIDO' | 'VENCIDO';

export interface AgreementAuditLog {
  id: number;
  agreement: number;
  user?: number | null;
  user_nombre?: string;
  user_email?: string;
  estado_anterior: string;
  estado_nuevo: string;
  comentario?: string;
  fecha_cambio: string;

  // Aliases opcionales para interoperabilidad
  agreementId?: number;
  previousStatus?: AgreementStatus;
  newStatus?: AgreementStatus;
  notes?: string;
  changedById?: number;
  changedByName?: string;
  timestamp?: string;
}

export interface Agreement {
  id: number;
  student?: number;
  student_nombre?: string;
  student_matricula?: string;
  session?: number | null;
  descripcion?: string;
  responsable?: number;
  responsable_nombre?: string;
  responsable_email?: string;
  fecha_limite?: string;
  estado?: AgreementStatus;
  estado_display?: string;
  fecha_conclusion?: string | null;
  created_by?: number | null;
  created_by_nombre?: string;
  created_at?: string;
  updated_at?: string;
  is_vencido?: boolean;
  audit_logs?: AgreementAuditLog[];

  // Aliases opcionales para interoperabilidad UI
  title?: string;
  studentId?: number;
  studentName?: string;
  studentMatricula?: string;
  tutoringSessionId?: number;
  tutoringSessionTitle?: string;
  semesterNumber?: number;
  description?: string;
  responsibleId?: number;
  responsibleName?: string;
  responsibleRole?: string;
  resolutionNotes?: string;
  dueDate?: string;
  status?: AgreementStatus;
  completionDate?: string;
  isOverdue?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgreementCreateRequest {
  student: number;
  session?: number | null;
  descripcion: string;
  responsable: number;
  fecha_limite: string;
  estado?: AgreementStatus;

  // Aliases opcionales
  studentId?: number;
  semesterNumber?: number;
  title?: string;
  description?: string;
  responsibleId?: number;
  dueDate?: string;
}


export interface AgreementStatusUpdateRequest {
  estado: AgreementStatus;
  comentario?: string;
}

export interface AgreementCreateResponse {
  agreement_created_id: number;
  mensaje: string;
  agreement: Agreement;
}

export interface AgreementStatusUpdateResponse {
  mensaje: string;
  agreement: Agreement;
}

export interface AgreementFilterParams {
  student?: number;
  student_id?: number;
  estado?: AgreementStatus;
  responsable?: number;
  responsable_id?: number;
  session?: number;
  session_id?: number;
  page?: number;
  search?: string;
}
