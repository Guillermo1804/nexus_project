import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TimelineEvent, TimelineEventType, TimelineSemester } from '../core/academic/academic.models';

type TimelineFilter = 'TODOS' | TimelineEventType;
type TimelineOrder = 'DESC' | 'ASC';

interface TimelineEntry {
  event: TimelineEvent;
  semester: TimelineSemester;
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
            @for (option of filterOptions; track option.value) {
              <button type="button" [class.active]="filter === option.value" [attr.aria-pressed]="filter === option.value" (click)="filter = option.value">
                {{ option.label }}
              </button>
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

  protected filter: TimelineFilter = 'TODOS';
  /** Newest first by default, so the most recent progress is what the user sees. */
  protected order: TimelineOrder = 'DESC';
  protected readonly orderOptions: { value: TimelineOrder; label: string }[] = [
    { value: 'DESC', label: 'Más reciente primero' },
    { value: 'ASC', label: 'Más antiguo primero' },
  ];
  protected readonly filterOptions: { value: TimelineFilter; label: string }[] = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'TUTORIA', label: 'Tutorías' },
    { value: 'ACUERDO', label: 'Acuerdos' },
    { value: 'TESIS', label: 'Tesis' },
    { value: 'EVIDENCIA', label: 'Evidencias' },
  ];

  /** One flat sequence: events are neither grouped by semester nor by day. */
  protected get entries(): TimelineEntry[] {
    const all: TimelineEntry[] = this.semesters.flatMap((semester) => semester.eventos.map((event) => ({ event, semester })));
    const filtered = this.filter === 'TODOS' ? all : all.filter((entry) => entry.event.tipo === this.filter);
    const direction = this.order === 'DESC' ? -1 : 1;
    return [...filtered].sort((a, b) => a.event.fecha.localeCompare(b.event.fecha) * direction);
  }

  protected typeLabel(type: TimelineEventType): string {
    return { TUTORIA: 'Tutoría', ACUERDO: 'Acuerdo', TESIS: 'Tesis', EVIDENCIA: 'Evidencia' }[type];
  }

  protected icon(type: TimelineEventType): string {
    return { TUTORIA: '◆', ACUERDO: '✓', TESIS: '▥', EVIDENCIA: '▣' }[type];
  }
}