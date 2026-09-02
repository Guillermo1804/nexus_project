import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AlertsResponse, AlertItem, TimelineResponse } from '../models/timeline.model';
import { CoordinatorDashboardResponse } from '../models/dashboard.model';
import {
  SupervisionAlertItem,
  SupervisionAlertsResponse,
  SupervisionAlertsCountByType
} from '../models/supervision-alert.model';

@Injectable({
  providedIn: 'root'
})
export class MonitoringService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/monitoring';

  // Reactive State Signals
  readonly alerts = signal<AlertItem[]>([]);
  readonly totalAlertas = signal<number>(0);
  readonly loadingAlerts = signal<boolean>(false);
  readonly errorAlerts = signal<string | null>(null);

  // Supervision Rules Engine Signals (HU-26)
  readonly supervisionAlerts = signal<SupervisionAlertItem[]>([]);
  readonly supervisionSummary = signal<SupervisionAlertsCountByType>({
    falta_tutoria: 0,
    acuerdo_sin_evidencia: 0,
    proxima_tutoria: 0
  });
  readonly totalSupervisionAlertas = signal<number>(0);
  readonly loadingSupervisionAlerts = signal<boolean>(false);
  readonly errorSupervisionAlerts = signal<string | null>(null);

  /**
   * Obtiene la lista reactiva de alertas del sistema (acuerdos vencidos, por vencer, falta de tutoría).
   */
  getAlerts(studentId?: number): Observable<AlertsResponse> {
    this.loadingAlerts.set(true);
    this.errorAlerts.set(null);

    let params = new HttpParams();
    if (studentId) {
      params = params.set('student', studentId.toString());
    }

    return this.http.get<AlertsResponse>(`${this.apiUrl}/alerts/`, { params }).pipe(
      tap({
        next: (res) => {
          this.alerts.set(res.alertas || []);
          this.totalAlertas.set(res.total_alertas || 0);
          this.loadingAlerts.set(false);
        },
        error: (err) => {
          this.errorAlerts.set(err.message || 'Error al cargar alertas');
          this.loadingAlerts.set(false);
        }
      })
    );
  }

  /**
   * Refresca las alertas del sistema actualizando los Signals.
   */
  refreshAlerts(studentId?: number): void {
    this.getAlerts(studentId).subscribe({
      error: () => {}
    });
  }

  /**
   * Obtiene las alertas proactivas del Motor de Reglas de Supervisión Activa (HU-26).
   */
  getSupervisionAlerts(studentId?: number): Observable<SupervisionAlertsResponse> {
    this.loadingSupervisionAlerts.set(true);
    this.errorSupervisionAlerts.set(null);

    let params = new HttpParams();
    if (studentId) {
      params = params.set('student', studentId.toString());
    }

    return this.http.get<SupervisionAlertsResponse>(`${this.apiUrl}/supervision-alerts/`, { params }).pipe(
      tap({
        next: (res) => {
          this.supervisionAlerts.set(res.alertas || []);
          this.supervisionSummary.set(res.alertas_por_tipo || {
            falta_tutoria: 0,
            acuerdo_sin_evidencia: 0,
            proxima_tutoria: 0
          });
          this.totalSupervisionAlertas.set(res.total_alertas || 0);
          this.loadingSupervisionAlerts.set(false);
        },
        error: (err) => {
          this.errorSupervisionAlerts.set(err.message || 'Error al cargar alertas de supervisión');
          this.loadingSupervisionAlerts.set(false);
        }
      })
    );
  }

  /**
   * Refresca las alertas de supervisión activa.
   */
  refreshSupervisionAlerts(studentId?: number): void {
    this.getSupervisionAlerts(studentId).subscribe({
      error: () => {}
    });
  }

  /**
   * Obtiene la trayectoria longitudinal completa de un estudiante unificando tutorías,
   * acuerdos, tesis, evidencias, publicaciones, congresos, estancias y productos.
   */
  getTimeline(studentId: number): Observable<TimelineResponse> {
    const params = new HttpParams().set('student', studentId.toString());
    return this.http.get<TimelineResponse>(`${this.apiUrl}/timeline/`, { params });
  }

  /**
   * Obtiene las métricas institucionales, semáforos de riesgo y tabla priorizada del Dashboard del Coordinador.
   */
  getCoordinatorDashboard(period?: string): Observable<CoordinatorDashboardResponse> {
    let params = new HttpParams();
    if (period && period !== 'TODOS') {
      params = params.set('period', period);
    }
    return this.http.get<CoordinatorDashboardResponse>(`${this.apiUrl}/coordinator-dashboard/`, { params });
  }
}
