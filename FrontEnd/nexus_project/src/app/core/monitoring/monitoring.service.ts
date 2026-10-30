import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardKPIs {
  total_estudiantes_activos: number;
  total_acuerdos_pendientes: number;
  total_acuerdos_vencidos: number;
  estudiantes_sin_tutoria_reciente: number;
  promedio_avance_tesis: number;
}

export interface DistribucionSemestre {
  semestre: number;
  total_alumnos: number;
}

export interface DistribucionAvanceTesis {
  rango_0_25: number;
  rango_26_50: number;
  rango_51_75: number;
  rango_76_100: number;
}

export interface EstudianteEnRezago {
  student_id: number;
  matricula: string;
  nombre_completo: string;
  motivo_rezago: string;
  asesor_principal: string;
}

export interface EstudianteActivo {
  id: number;
  matricula: string;
  nombre: string;
  nombre_completo?: string;
  programa_doctoral?: string;
  cohorte?: string;
  estatus_activo?: boolean;
  semestre: string | number;
  asesor: string;
}

export interface TutoriaPeriodo {
  id: number;
  fecha: string;
  modalidad: string;
  estudiante: string;
  matricula: string;
  semestre: string | number;
  resumen: string;
}

export interface AcuerdoSegumiento {
  id: number;
  descripcion: string;
  estado: string;
  fecha_limite: string;
  responsable: string;
  estudiante: string;
  matricula: string;
}

export interface AcuerdoVencido {
  id: number;
  descripcion: string;
  estado: string;
  fecha_limite: string;
  fecha_conclusion: string | null;
  responsable: string;
  estudiante: string;
  matricula: string;
  dias_vencido: number;
}

export interface DashboardResponse {
  kpis: DashboardKPIs;
  distribucion_semestres: DistribucionSemestre[];
  distribucion_avance_tesis: DistribucionAvanceTesis;
  estudiantes_en_rezago: EstudianteEnRezago[];
  estudiantes_sin_tutoria_reciente: EstudianteEnRezago[];
  estudiantes_activos: EstudianteActivo[];
  tutorias_periodo: TutoriaPeriodo[];
  acuerdos_segumiento: AcuerdoSegumiento[];
  acuerdos_vencidos: AcuerdoVencido[];
}

@Injectable({ providedIn: 'root' })
export class MonitoringService {
  private readonly apiUrl = `${environment.apiUrl}/monitoring`;

  constructor(private readonly http: HttpClient) {}

  getDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${this.apiUrl}/dashboard/`);
  }

  getEstudiantesActivos(): Observable<EstudianteActivo[]> {
    return this.http.get<EstudianteActivo[]>(`${this.apiUrl}/dashboard/estudiantes-activos/`);
  }

  getTutoriasPeriodo(): Observable<TutoriaPeriodo[]> {
    return this.http.get<TutoriaPeriodo[]>(`${this.apiUrl}/dashboard/tutorias-periodo/`);
  }

  getAcuerdosSegumiento(): Observable<AcuerdoSegumiento[]> {
    return this.http.get<AcuerdoSegumiento[]>(`${this.apiUrl}/dashboard/acuerdos-seguimiento/`);
  }

  getAcuerdosVencidos(): Observable<AcuerdoVencido[]> {
    return this.http.get<AcuerdoVencido[]>(`${this.apiUrl}/dashboard/acuerdos-vencidos/`);
  }
}