import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MonitoringService } from '../../core/services/monitoring.service';
import { ReportingService } from '../../core/services/reporting.service';
import {
  DashboardKPIs,
  RiskSemaphore,
  PrioritizedStudent,
  CohortDistribution,
  RiskLevel
} from '../../core/models/dashboard.model';
import {
  SupervisionAlertItem,
  SupervisionAlertType,
  SupervisionAlertSeverity
} from '../../core/models/supervision-alert.model';
import { PillBadgeComponent } from '../../shared/components/pill-badge/pill-badge.component';

import { AuthService } from '../../core/services/auth.service';
import { PeriodService } from '../../core/services/period.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PillBadgeComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private monitoringService = inject(MonitoringService);
  private reportingService = inject(ReportingService);
  readonly periodService = inject(PeriodService);
  private router = inject(Router);

  readonly isExporting = this.reportingService.exporting;

  // Reactive State Signals - Dashboard General
  readonly kpis = signal<DashboardKPIs | null>(null);
  readonly riskSemaphore = signal<RiskSemaphore | null>(null);
  readonly prioritizedStudents = signal<PrioritizedStudent[]>([]);
  readonly cohortDistribution = signal<CohortDistribution[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  // Filters Signals
  readonly riskFilter = signal<RiskLevel | 'TODOS'>('TODOS');
  readonly cohortFilter = signal<string>('TODAS');
  readonly searchTerm = signal<string>('');

  // Supervision Rules Signals (HU-26)
  readonly supervisionAlerts = this.monitoringService.supervisionAlerts;
  readonly supervisionSummary = this.monitoringService.supervisionSummary;
  readonly totalSupervisionAlertas = this.monitoringService.totalSupervisionAlertas;
  readonly loadingSupervision = this.monitoringService.loadingSupervisionAlerts;
  readonly errorSupervision = this.monitoringService.errorSupervisionAlerts;

  readonly supervisionTypeFilter = signal<SupervisionAlertType | 'TODAS'>('TODAS');
  readonly supervisionSeverityFilter = signal<SupervisionAlertSeverity | 'TODAS'>('TODAS');

  // Available unique cohorts
  readonly availableCohorts = computed(() => {
    const list = this.cohortDistribution();
    return list.map(c => c.cohorte);
  });

  // Filtered Students Computed Signal
  readonly filteredStudents = computed(() => {
    let result = this.prioritizedStudents();
    const risk = this.riskFilter();
    const cohort = this.cohortFilter();
    const search = this.searchTerm().trim().toLowerCase();

    if (risk !== 'TODOS') {
      result = result.filter(st => st.nivel_riesgo === risk);
    }

    if (cohort !== 'TODAS') {
      result = result.filter(st => st.cohorte === cohort);
    }

    if (search) {
      result = result.filter(st =>
        st.nombre.toLowerCase().includes(search) ||
        st.matricula.toLowerCase().includes(search) ||
        st.asesor_principal.toLowerCase().includes(search)
      );
    }

    return result;
  });

  // Filtered Supervision Alerts Computed Signal (HU-26)
  readonly filteredSupervisionAlerts = computed(() => {
    let alerts = this.supervisionAlerts();
    const typeF = this.supervisionTypeFilter();
    const sevF = this.supervisionSeverityFilter();

    if (typeF !== 'TODAS') {
      alerts = alerts.filter(a => a.tipo === typeF);
    }

    if (sevF !== 'TODAS') {
      alerts = alerts.filter(a => a.severidad === sevF);
    }

    return alerts;
  });

  constructor() {
    // Escucha reactiva a cambios en el selector de ciclo para recargar y filtrar métricas
    effect(() => {
      const activePeriod = this.periodService.activePeriod();
      if (!this.authService.isStudent()) {
        this.loadDashboard(activePeriod);
      }
    });
  }

  ngOnInit(): void {
    if (this.authService.isStudent()) {
      const stId = this.authService.getStudentId();
      this.router.navigate(['/students', stId || 'me']);
      return;
    }
    this.loadSupervisionAlerts();
  }

  loadAll(): void {
    this.loadDashboard(this.periodService.activePeriod());
    this.loadSupervisionAlerts();
  }

  loadDashboard(period?: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.monitoringService.getCoordinatorDashboard(period).subscribe({
      next: (data) => {
        this.kpis.set(data.kpis);
        this.riskSemaphore.set(data.semaforo_riesgo);
        this.prioritizedStudents.set(data.tabla_priorizada || []);
        this.cohortDistribution.set(data.distribucion_cohorte || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Error al cargar los datos del dashboard institucional');
        this.loading.set(false);
      }
    });
  }

  loadSupervisionAlerts(): void {
    this.monitoringService.getSupervisionAlerts().subscribe({
      error: () => {}
    });
  }

  setRiskFilter(filter: RiskLevel | 'TODOS'): void {
    this.riskFilter.set(filter);
  }

  setCohortFilter(cohort: string): void {
    this.cohortFilter.set(cohort);
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
  }

  clearFilters(): void {
    this.riskFilter.set('TODOS');
    this.cohortFilter.set('TODAS');
    this.searchTerm.set('');
  }

  setSupervisionTypeFilter(type: SupervisionAlertType | 'TODAS'): void {
    this.supervisionTypeFilter.set(type);
  }

  setSupervisionSeverityFilter(sev: SupervisionAlertSeverity | 'TODAS'): void {
    this.supervisionSeverityFilter.set(sev);
  }

  navigateToStudent(studentId: number): void {
    this.router.navigate(['/students', studentId]);
  }

  navigateToDossier(studentId: number): void {
    this.router.navigate(['/students', studentId, 'dossier']);
  }

  getRiskBadgeType(nivel: RiskLevel): 'VENCIDO' | 'EN_PROCESO' | 'CONCLUIDO' {
    switch (nivel) {
      case 'CRITICO':
        return 'VENCIDO';
      case 'PREVENTIVO':
        return 'EN_PROCESO';
      case 'AL_DIA':
        return 'CONCLUIDO';
      default:
        return 'CONCLUIDO';
    }
  }

  getRiskLabel(nivel: RiskLevel): string {
    switch (nivel) {
      case 'CRITICO':
        return 'Atención Crítica';
      case 'PREVENTIVO':
        return 'Preventiva';
      case 'AL_DIA':
        return 'Al Día';
      default:
        return nivel;
    }
  }

  getSeverityBadgeType(sev: SupervisionAlertSeverity): 'VENCIDO' | 'EN_PROCESO' | 'PENDIENTE' | 'CONCLUIDO' {
    switch (sev) {
      case 'ALTA':
        return 'VENCIDO';
      case 'MEDIA':
        return 'EN_PROCESO';
      case 'INFORMATIVA':
        return 'PENDIENTE';
      default:
        return 'CONCLUIDO';
    }
  }

  getSupervisionTypeIcon(type: SupervisionAlertType): string {
    switch (type) {
      case 'FALTA_TUTORIA_ACTIVA':
        return '📘';
      case 'ACUERDO_SIN_EVIDENCIA':
        return '📎';
      case 'PROXIMA_TUTORIA_CERCANA':
        return '📅';
      default:
        return '⚡';
    }
  }

  // Export Engine Integration (HU-28)
  exportCohortExcel(): void {
    this.reportingService.downloadCohortSummary('xlsx');
  }

  exportStudentExcel(studentId: number, matricula?: string): void {
    this.reportingService.downloadStudentDossier(studentId, 'xlsx', matricula);
  }

  exportStudentPdf(studentId: number, matricula?: string): void {
    this.reportingService.downloadStudentDossier(studentId, 'pdf', matricula);
  }
}
