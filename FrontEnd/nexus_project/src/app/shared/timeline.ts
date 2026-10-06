import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TimelineEvent, TimelineEventType, TimelineSemester } from '../core/academic/academic.models';

type TimelineOrder = 'DESC' | 'ASC';

interface TimelineEntry {
  event: TimelineEvent;
  semester: TimelineSemester;
}

/** Las fechas llegan como `YYYY-MM-DD`, así que basta la comparación directa. */
function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

@Component({
  selector: 'app-timeline',
  imports: [CommonModule],
  template: `
    <section class="timeline" aria-labelledby="timeline-title">
      <header class="timeline-header">
        <div>
          <span class="eyebrow">TRAYECTORIA LONGITUDINAL</span>
          <h2 id="timeline-title">Línea de Tiempo</h2>
          <p>Tutorías, acuerdos, avances de tesis y evidencias en una sola secuencia cronológica.</p>
        </div>
        <div class="controls">
          <div class="filters" role="group" aria-label="Filtrar eventos de la línea de tiempo">
            <button type="button" [class.active]="filters.length === 0" [attr.aria-pressed]="filters.length === 0" (click)="clearFilters()">
              Todos
            </button>
            @for (option of typeOptions; track option.value) {
              <button type="button" [class.active]="isFiltered(option.value)" [attr.aria-pressed]="isFiltered(option.value)" (click)="toggleFilter(option.value)">
                {{ option.label }}
                @if (countOf(option.value) > 0) { <span class="count">{{ countOf(option.value) }}</span> }
              </button>
            }
            @if (filters.length > 0) {
              <button type="button" class="clear" (click)="clearFilters()">Limpiar</button>
            }
          </div>
          <div class="order" role="group" aria-label="Ordenar eventos de la línea de tiempo">
            @for (option of orderOptions; track option.value) {
              <button type="button" [class.active]="order === option.value" [attr.aria-pressed]="order === option.value" (click)="order = option.value">
                {{ option.label }}
              </button>
            }
          </div>
        </div>
      </header>

      @if (visibleCount > 0 && entries.length < visibleCount) {
        <p class="filter-note" role="status">
          Mostrando {{ entries.length }} de {{ visibleCount }} eventos.
          <button type="button" class="link" (click)="clearFilters()">Ver todos</button>
        </p>
      }

      @if (entries.length) {
        <ol aria-label="Trayectoria cronológica del estudiante">
          @for (entry of entries; track entry.event.id) {
            <li class="event" [class]="'event ' + entry.event.tipo.toLowerCase()">
              <span class="node" aria-hidden="true">{{ icon(entry.event.tipo) }}</span>
              <article>
                <div class="event-heading">
                  <span class="type-badge">{{ typeLabel(entry.event.tipo) }}</span>
                  <span class="semester-badge">Semestre {{ entry.semester.numero }}</span>
                  @if (entry.semester.activo) { <span class="semester-badge current">Actual</span> }
                  <time [attr.datetime]="entry.event.fecha">{{ entry.event.fecha | date:'longDate' }}</time>
                </div>
                <h4>{{ entry.event.titulo }}</h4>
                @if (entry.event.descripcion) { <p>{{ entry.event.descripcion }}</p> }
                @if (entry.event.tipo === 'EVIDENCIA' && entry.event.actividad; as activity) {
                  <div class="evidence-context" aria-label="Actividad relacionada">
                    <strong>Vinculada a: {{ activity.etiqueta }}</strong>
                    @if (activity.titulo) { <span>{{ activity.titulo }}</span> }
                    @if (activity.fecha) { <time [attr.datetime]="activity.fecha">Fecha de actividad: {{ activity.fecha | date:'longDate' }}</time> }
                  </div>
                }
                <footer>
                  @if (entry.event.actor) { <span>Responsable: {{ entry.event.actor }}</span> }
                  @if (entry.event.estado_efectivo) { <span class="status">{{ entry.event.estado_efectivo.replaceAll('_', ' ') }}</span> }
                  @if (entry.event.porcentaje !== undefined) { <span class="status">{{ entry.event.porcentaje }}%</span> }
                  @if (entry.event.archivo_url) { <a [href]="entry.event.archivo_url" target="_blank" rel="noopener">Ver evidencia</a> }
                  @if (entry.event.enlace_url) { <a [href]="entry.event.enlace_url" target="_blank" rel="noopener">Abrir enlace</a> }
                </footer>
              </article>
            </li>
          }
        </ol>
      } @else {
        <p class="empty" role="status">No hay eventos para el filtro seleccionado.</p>
      }
    </section>
  `,
  styleUrl: './timeline.scss',
})
export class TimelineComponent {
  @Input({ required: true }) semesters: TimelineSemester[] = [];
  private selectedInitialFilter: TimelineEventType | null = null;
  @Input() set initialFilter(value: TimelineEventType | null) {
    this.selectedInitialFilter = value;
    this.filters = value ? [value] : [];
  }
  get initialFilter(): TimelineEventType | null { return this.selectedInitialFilter; }

  /** Tipos marcados. Vacío significa «todos», que es el estado inicial. */
  protected filters: TimelineEventType[] = [];
  /** Newest first by default, so the most recent progress is what the user sees. */
  protected order: TimelineOrder = 'DESC';
  protected readonly orderOptions: { value: TimelineOrder; label: string }[] = [
    { value: 'DESC', label: 'Más reciente primero' },
    { value: 'ASC', label: 'Más antiguo primero' },
  ];
  protected readonly typeOptions: { value: TimelineEventType; label: string }[] = [
    { value: 'TUTORIA', label: 'Tutorías' },
    { value: 'ACUERDO', label: 'Acuerdos' },
    { value: 'TESIS', label: 'Tesis' },
    { value: 'EVIDENCIA', label: 'Evidencias' },
  ];

  protected isFiltered(type: TimelineEventType): boolean { return this.filters.includes(type); }

  /** Los filtros se acumulan: cada pulsación suma o quita un tipo, sin excluir al resto. */
  protected toggleFilter(type: TimelineEventType): void {
    this.filters = this.isFiltered(type) ? this.filters.filter((item) => item !== type) : [...this.filters, type];
  }

  protected clearFilters(): void { this.filters = []; }

  /** Cuántos eventos hay de ese tipo, para que el botón diga si filtraría con datos. */
  protected countOf(type: TimelineEventType): number {
    return this.semesters.reduce((total, semester) => total + semester.eventos.filter((event) => event.tipo === type).length, 0);
  }

  protected get visibleCount(): number {
    return this.semesters.reduce((total, semester) => total + semester.eventos.length, 0);
  }

  /**
   * One flat sequence: events are neither grouped by semester nor by day.
   *
   * Los acuerdos heredan la fecha de su sesión, así que un mismo día reúne varios
   * eventos. Sin un desempate el orden de ese día queda al azar (un acuerdo aparecía
   * antes que la tutoría que lo originó), por eso se usa `orden` del backend y, si no
   * existiera, la posición de llegada. Los empates conservan siempre el mismo criterio
   * en ambos sentidos: invertir el orden invierte la lista completa.
   */
  protected get entries(): TimelineEntry[] {
    const all: TimelineEntry[] = this.semesters.flatMap((semester) => semester.eventos.map((event) => ({ event, semester })));
    const filtered = this.filters.length === 0 ? all : all.filter((entry) => this.filters.includes(entry.event.tipo));
    const direction = this.order === 'DESC' ? -1 : 1;
    return filtered
      .map((entry, position) => ({ entry, position }))
      .sort((a, b) => {
        const byDate = compareDates(a.entry.event.fecha, b.entry.event.fecha);
        if (byDate) return byDate * direction;
        const byOrder = (a.entry.event.orden ?? a.position) - (b.entry.event.orden ?? b.position);
        return (byOrder || a.position - b.position) * direction;
      })
      .map(({ entry }) => entry);
  }

  protected typeLabel(type: TimelineEventType): string {
    return { TUTORIA: 'Tutoría', ACUERDO: 'Acuerdo', TESIS: 'Tesis', EVIDENCIA: 'Evidencia' }[type];
  }

  protected icon(type: TimelineEventType): string {
    return { TUTORIA: '◆', ACUERDO: '✓', TESIS: '▥', EVIDENCIA: '▣' }[type];
  }
}