export type SupervisionAlertType =
  | 'FALTA_TUTORIA_ACTIVA'
  | 'ACUERDO_SIN_EVIDENCIA'
  | 'PROXIMA_TUTORIA_CERCANA';

export type SupervisionAlertSeverity = 'ALTA' | 'MEDIA' | 'INFORMATIVA';

export interface SupervisionAlertItem {
  regla_id: string;
  tipo: SupervisionAlertType;
  severidad: SupervisionAlertSeverity;
  titulo: string;
  mensaje: string;
  student_id: number;
  student_nombre: string;
  student_matricula: string;
  dias_sin_tutoria?: number;
  ultima_tutoria_fecha?: string | null;
  agreement_id?: number;
  agreement_descripcion?: string;
  responsable_nombre?: string;
  fecha_conclusion?: string | null;
  session_id?: number;
  fecha_proxima_reunion?: string;
  dias_restantes?: number;
  modalidad?: string;
  notas?: string;
}

export interface SupervisionAlertsCountByType {
  falta_tutoria: number;
  acuerdo_sin_evidencia: number;
  proxima_tutoria: number;
}

export interface SupervisionAlertsResponse {
  total_alertas: number;
  alertas_por_tipo: SupervisionAlertsCountByType;
  alertas: SupervisionAlertItem[];
}
