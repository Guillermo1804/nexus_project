export type RiskLevel = 'CRITICO' | 'PREVENTIVO' | 'AL_DIA';

export interface DashboardKPIs {
  total_estudiantes_activos: number;
  total_tutorias_periodo: number;
  total_acuerdos_activos: number;
  total_acuerdos_vencidos: number;
  tasa_cumplimiento_acuerdos: number;
  promedio_avance_tesis: number;
}

export interface RiskSemaphore {
  atencion_critica: number;
  atencion_preventiva: number;
  alumnos_al_dia: number;
  total_evaluados: number;
}

export interface PrioritizedStudent {
  id: number;
  matricula: string;
  nombre: string;
  cohorte: string;
  asesor_principal: string;
  dias_sin_tutoria: number | null;
  dias_sin_tutoria_display: string;
  acuerdos_vencidos: number;
  avance_tesis: number;
  nivel_riesgo: RiskLevel;
  badge_color: string;
  badge_bg: string;
}

export interface CohortDistribution {
  cohorte: string;
  promedio_avance: number;
  total_estudiantes: number;
}

export interface CoordinatorDashboardResponse {
  kpis: DashboardKPIs;
  semaforo_riesgo: RiskSemaphore;
  tabla_priorizada: PrioritizedStudent[];
  distribucion_cohorte: CohortDistribution[];
}
