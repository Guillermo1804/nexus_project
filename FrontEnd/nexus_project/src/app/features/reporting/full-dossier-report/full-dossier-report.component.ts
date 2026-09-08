import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReportingService } from '../../../core/services/reporting.service';
import { PeriodService } from '../../../core/services/period.service';
import { FullDossier, DossierThesisProgress } from '../../../core/models/dossier.model';
import { PillBadgeComponent, PillBadgeType } from '../../../shared/components/pill-badge/pill-badge.component';

@Component({
  selector: 'app-full-dossier-report',
  standalone: true,
  imports: [CommonModule, RouterModule, PillBadgeComponent],
  templateUrl: './full-dossier-report.component.html',
  styleUrls: ['./full-dossier-report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FullDossierReportComponent implements OnInit {
  private reportingService = inject(ReportingService);
  readonly periodService = inject(PeriodService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Route input / query
  readonly id = input<string>();

  // State signals
  readonly dossier = signal<FullDossier | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  
  // Set of collapsed section keys for interactive UI mode
  readonly collapsedSections = signal<Set<string>>(new Set());

  // Computed properties
  readonly studentId = computed(() => {
    const routeId = this.id() || this.route.snapshot.paramMap.get('id');
    return routeId ? Number(routeId) : 1;
  });

  readonly student = computed(() => this.dossier()?.student || null);
  readonly kpis = computed(() => this.dossier()?.kpis || null);
  readonly committee = computed(() => this.dossier()?.committee || []);
  readonly semesters = computed(() => this.dossier()?.semesters || []);
  readonly tutoringSessions = computed(() => this.dossier()?.tutoring_sessions || []);
  readonly agreements = computed(() => this.dossier()?.agreements || []);
  readonly thesisProgress = computed(() => this.dossier()?.thesis_progress || []);
  readonly publications = computed(() => this.dossier()?.publications || []);
  readonly academicEvents = computed(() => this.dossier()?.academic_events || []);
  readonly researchStays = computed(() => this.dossier()?.research_stays || []);
  readonly otherProducts = computed(() => this.dossier()?.other_products || []);
  readonly evidences = computed(() => this.dossier()?.evidences || []);

  readonly latestThesisProgress = computed(() => {
    const list = this.thesisProgress();
    return list.length > 0 ? list[0] : null;
  });

  readonly folioDocumento = computed(() => {
    const st = this.student();
    const year = new Date().getFullYear();
    return st ? `CED-DOC-${st.matricula}-${year}` : `CED-DOC-${year}`;
  });

  ngOnInit(): void {
    const sId = this.studentId();
    this.loadDossier(sId);
  }

  loadDossier(studentId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.reportingService.getFullDossier(studentId).subscribe({
      next: (data) => {
        this.dossier.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(
          err.status === 403
            ? 'Acceso denegado: No cuenta con permisos para consultar este expediente.'
            : 'No se pudo cargar el reporte del expediente. Verifique la conexión con el servidor.'
        );
        this.isLoading.set(false);
      }
    });
  }

  toggleSection(sectionId: string): void {
    const current = new Set(this.collapsedSections());
    if (current.has(sectionId)) {
      current.delete(sectionId);
    } else {
      current.add(sectionId);
    }
    this.collapsedSections.set(current);
  }

  isSectionCollapsed(sectionId: string): boolean {
    return this.collapsedSections().has(sectionId);
  }

  expandAll(): void {
    this.collapsedSections.set(new Set());
  }

  collapseAll(): void {
    this.collapsedSections.set(new Set([
      'committee',
      'semesters',
      'tutoring',
      'agreements',
      'thesis',
      'publications',
      'events',
      'stays',
      'products',
      'evidences'
    ]));
  }

  printDossier(): void {
    window.print();
  }

  // Export Engine Integration (HU-28)
  exportExcel(): void {
    const sId = this.studentId();
    const st = this.student();
    this.reportingService.downloadStudentDossier(sId, 'xlsx', st?.matricula);
  }

  exportPdf(): void {
    const sId = this.studentId();
    const st = this.student();
    this.reportingService.downloadStudentDossier(sId, 'pdf', st?.matricula);
  }

  goBack(): void {
    const sId = this.studentId();
    this.router.navigate(['/students', sId]);
  }

  getAgreementBadgeType(status: string): PillBadgeType {
    switch (status) {
      case 'CONCLUIDO': return 'CONCLUIDO';
      case 'EN_PROCESO': return 'EN_PROCESO';
      case 'PENDIENTE': return 'PENDIENTE';
      case 'VENCIDO': return 'VENCIDO';
      default: return 'INFO';
    }
  }

  getComponentEntries(components: Record<string, number> | undefined): { label: string; value: number }[] {
    if (!components) return [];
    const labelsMap: Record<string, string> = {
      protocolo: 'Protocolo de Investigación',
      estadoArte: 'Estado del Arte',
      marcoTeorico: 'Marco Teórico',
      metodologia: 'Metodología',
      analisis: 'Análisis y Resultados',
      redaccion: 'Redacción de Tesis'
    };

    return Object.entries(components).map(([key, value]) => ({
      label: labelsMap[key] || key,
      value: typeof value === 'number' ? value : 0
    }));
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
