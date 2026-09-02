import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitoringService } from '../../../core/services/monitoring.service';
import { TimelineEvent, TimelineNodeType, TimelineObservation } from '../../../core/models/timeline.model';
import { PillBadgeComponent } from '../pill-badge/pill-badge.component';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, PillBadgeComponent],
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit, OnChanges {
  private monitoringService = inject(MonitoringService);

  @Input() studentId?: number;
  @Input() initialEvents?: TimelineEvent[];

  // Signals
  readonly events = signal<TimelineEvent[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly selectedTypeFilter = signal<TimelineNodeType | 'TODOS'>('TODOS');
  readonly selectedEvent = signal<TimelineEvent | null>(null);
  readonly isDrawerOpen = signal<boolean>(false);

  // Filtered Events Computed Signal
  readonly filteredEvents = computed(() => {
    const filter = this.selectedTypeFilter();
    const all = this.events();
    if (filter === 'TODOS') {
      return all;
    }
    return all.filter(e => e.tipo === filter);
  });

  // Event counts
  readonly counts = computed(() => {
    const all = this.events();
    return {
      TODOS: all.length,
      TUTORIA: all.filter(e => e.tipo === 'TUTORIA').length,
      ACUERDO: all.filter(e => e.tipo === 'ACUERDO').length,
      TESIS: all.filter(e => e.tipo === 'TESIS').length,
      EVIDENCIA: all.filter(e => e.tipo === 'EVIDENCIA').length,
      PUBLICACION: all.filter(e => e.tipo === 'PUBLICACION').length,
      CONGRESO: all.filter(e => e.tipo === 'CONGRESO').length,
      ESTANCIA: all.filter(e => e.tipo === 'ESTANCIA').length,
      PRODUCTO: all.filter(e => e.tipo === 'PRODUCTO').length,
    };
  });

  ngOnInit(): void {
    if (this.initialEvents && this.initialEvents.length > 0) {
      this.events.set(this.initialEvents);
    } else if (this.studentId) {
      this.loadTimeline();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['studentId'] && !changes['studentId'].isFirstChange() && this.studentId) {
      this.loadTimeline();
    }
    if (changes['initialEvents'] && this.initialEvents) {
      this.events.set(this.initialEvents);
    }
  }

  loadTimeline(): void {
    if (!this.studentId) return;

    this.loading.set(true);
    this.error.set(null);

    this.monitoringService.getTimeline(this.studentId).subscribe({
      next: (res) => {
        this.events.set(res.timeline || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Error al cargar la trayectoria longitudinal');
        this.loading.set(false);
      }
    });
  }

  setFilter(type: TimelineNodeType | 'TODOS'): void {
    this.selectedTypeFilter.set(type);
  }

  openDrawer(event: TimelineEvent): void {
    this.selectedEvent.set(event);
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.selectedEvent.set(null);
  }

  getTimelineObservations(obs?: string | TimelineObservation[]): TimelineObservation[] {
    if (!obs) return [];
    if (Array.isArray(obs)) return obs;
    return [{ titulo: 'Observación', contenido: obs, autor: 'Comité Tutorial' }];
  }

  getAgreementBadgeType(estado: string): 'PENDIENTE' | 'EN_PROCESO' | 'CONCLUIDO' | 'VENCIDO' {
    switch (estado?.toUpperCase()) {
      case 'PENDIENTE':
        return 'PENDIENTE';
      case 'EN_PROCESO':
        return 'EN_PROCESO';
      case 'CONCLUIDO':
        return 'CONCLUIDO';
      case 'VENCIDO':
        return 'VENCIDO';
      default:
        return 'PENDIENTE';
    }
  }

  getComponentsList(componentsJson?: Record<string, number>): { key: string; value: number; label: string }[] {
    if (!componentsJson) return [];
    const labelMap: Record<string, string> = {
      protocolo: 'Protocolo de Investigación',
      estadoArte: 'Estado del Arte',
      marcoTeorico: 'Marco Teórico',
      metodologia: 'Metodología',
      analisis: 'Análisis de Resultados',
      redaccion: 'Redacción de Tesis'
    };

    return Object.entries(componentsJson).map(([key, value]) => ({
      key,
      value: Number(value) || 0,
      label: labelMap[key] || key
    }));
  }

  formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
