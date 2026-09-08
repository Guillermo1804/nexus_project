import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThesisService } from '../../../core/services/thesis.service';
import { ThesisHistoryResponse, ThesisHistoryItem, ThesisComponents } from '../../../core/models/thesis.model';
import { PillBadgeComponent } from '../../../shared/components/pill-badge/pill-badge.component';

export interface SemesterEvolutionItem {
  semesterNumber: number;
  percentage: number;
  hasRecord: boolean;
  registrationDate?: string;
  components: ThesisComponents;
  observations?: string;
  statusText: string;
  badgeType: 'CONCLUIDO' | 'EN_PROCESO' | 'PENDIENTE' | 'INFO';
}

@Component({
  selector: 'app-thesis-history-chart',
  standalone: true,
  imports: [CommonModule, PillBadgeComponent],
  templateUrl: './thesis-history-chart.component.html',
  styleUrls: ['./thesis-history-chart.component.scss']
})
export class ThesisHistoryChartComponent implements OnInit {
  private thesisService = inject(ThesisService);

  readonly studentId = input<number>(0);
  readonly isReadOnly = input<boolean>(false);
  readonly registerRequested = output<void>();
  readonly semesterSelected = output<number>();

  readonly history = signal<ThesisHistoryResponse | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly selectedSemesterNumber = signal<number>(1);

  readonly defaultComponents: ThesisComponents = {
    protocolo: 0,
    estadoArte: 0,
    marcoTeorico: 0,
    metodologia: 0,
    analisis: 0,
    redaccion: 0
  };

  // Evolution for Semesters 1 to 6
  readonly semesterEvolution = computed<SemesterEvolutionItem[]>(() => {
    const histData = this.history();
    const records = histData?.historico || [];

    const evolution: SemesterEvolutionItem[] = [];
    for (let sem = 1; sem <= 6; sem++) {
      // Find latest record for this semester
      const record = records
        .filter(r => (r.semester_numero || r.semesterNumber) === sem)
        .pop();

      if (record) {
        const pct = record.porcentaje_avance ?? record.percentage ?? 0;
        let statusText = 'En Proceso';
        let badgeType: 'CONCLUIDO' | 'EN_PROCESO' | 'PENDIENTE' | 'INFO' = 'EN_PROCESO';

        if (pct >= 100) {
          statusText = 'Concluido';
          badgeType = 'CONCLUIDO';
        } else if (pct === 0) {
          statusText = 'Sin Avance';
          badgeType = 'PENDIENTE';
        }

        evolution.push({
          semesterNumber: sem,
          percentage: pct,
          hasRecord: true,
          registrationDate: record.fecha_registro || record.registrationDate,
          components: record.componentes || record.componentes_json || record.components || this.defaultComponents,
          observations: record.observaciones || record.observations || '',
          statusText,
          badgeType
        });
      } else {
        evolution.push({
          semesterNumber: sem,
          percentage: 0,
          hasRecord: false,
          components: this.defaultComponents,
          observations: '',
          statusText: 'Pendiente',
          badgeType: 'PENDIENTE'
        });
      }
    }
    return evolution;
  });

  readonly selectedSemesterDetail = computed<SemesterEvolutionItem | null>(() => {
    const targetSem = this.selectedSemesterNumber();
    return this.semesterEvolution().find(s => s.semesterNumber === targetSem) || null;
  });

  readonly currentOverallProgress = computed<number>(() => {
    return this.history()?.progreso_actual || 0;
  });

  readonly totalRecordsCount = computed<number>(() => {
    return this.history()?.total_registros || 0;
  });

  ngOnInit(): void {
    if (this.studentId() > 0) {
      this.loadHistory(this.studentId());
    }
  }

  loadHistory(studentId: number): void {
    this.isLoading.set(true);
    this.thesisService.getThesisHistory(studentId).subscribe({
      next: (res) => {
        this.history.set(res);
        this.isLoading.set(false);
        // Select the latest recorded semester by default
        if (res.historico && res.historico.length > 0) {
          const lastSem = res.historico[res.historico.length - 1].semester_numero || 1;
          this.selectedSemesterNumber.set(lastSem);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  selectSemester(semesterNum: number): void {
    this.selectedSemesterNumber.set(semesterNum);
    this.semesterSelected.emit(semesterNum);
  }

  onRegisterClick(): void {
    this.registerRequested.emit();
  }

  getComponentLabel(key: string): string {
    const labels: Record<string, string> = {
      protocolo: 'Protocolo de Investigación',
      estadoArte: 'Estado del Arte / Antecedentes',
      marcoTeorico: 'Marco Teórico y Conceptual',
      metodologia: 'Diseño Metodológico',
      analisis: 'Análisis y Discusión de Resultados',
      redaccion: 'Redacción del Manuscrito Final'
    };
    return labels[key] || key;
  }
}
