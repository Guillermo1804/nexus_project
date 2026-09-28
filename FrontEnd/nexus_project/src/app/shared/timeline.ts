import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TimelineEvent, TimelineEventType, TimelineSemester } from '../core/academic/academic.models';

type TimelineFilter = 'TODOS' | TimelineEventType;

@Component({
  selector: 'app-timeline',
  imports: [CommonModule],
  template: `
    <section class="timeline" aria-labelledby="timeline-title">
      <header class="timeline-header">
        <div>
          <span class="eyebrow">TRAYECTORIA LONGITUDINAL</span>
          <h2 id="timeline-title">Línea de Tiempo</h2>
          <p>Tutorías, acuerdos, avances de tesis y evidencias en orden cronológico.</p>
        </div>
        <div class="filters" role="group" aria-label="Filtrar eventos de la línea de tiempo">
          @for (option of filterOptions; track option.value) {
            <button type="button" [class.active]="filter === option.value" [attr.aria-pressed]="filter === option.value" (click)="filter = option.value">
              {{ option.label }}
            </button>
          }
        </div>
      </header>

      @if (hasVisibleEvents) {
        <ol aria-label="Trayectoria cronológica del estudiante">
          @for (semester of semesters; track semester.id) {
            @if (visibleEvents(semester).length) {
              <li class="semester-group">
                <div class="semester-heading">
                  <h3>Semestre {{ semester.numero }}</h3>
                  @if (semester.activo) { <span>Actual</span> }
                </div>
                <ol aria-label="Eventos del semestre {{ semester.numero }}">
                  @for (event of visibleEvents(semester); track event.id) {
                    <li class="event" [class]="'event ' + event.tipo.toLowerCase()">
                      <span class="node" aria-hidden="true">{{ icon(event.tipo) }}</span>
                      <article>
                        <div class="event-heading">
                          <span class="type-badge">{{ typeLabel(event.tipo) }}</span>
                          <time [attr.datetime]="event.fecha">{{ event.fecha | date:'longDate' }}</time>
                        </div>
                        <h4>{{ event.titulo }}</h4>
                        @if (event.descripcion) { <p>{{ event.descripcion }}</p> }
                        <footer>
                          @if (event.actor) { <span>Responsable: {{ event.actor }}</span> }
                          @if (event.estado_efectivo) { <span class="status">{{ event.estado_efectivo.replaceAll('_', ' ') }}</span> }
                          @if (event.porcentaje !== undefined) { <span class="status">{{ event.porcentaje }}%</span> }
                          @if (event.archivo_url) { <a [href]="event.archivo_url" target="_blank" rel="noopener">Ver evidencia</a> }
                          @if (event.enlace_url) { <a [href]="event.enlace_url" target="_blank" rel="noopener">Abrir enlace</a> }
                        </footer>
                      </article>
                    </li>
                  }
                </ol>
              </li>
            }
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
  protected readonly filterOptions: { value: TimelineFilter; label: string }[] = [
    { value: 'TODOS', label: 'Todos' },
    { value: 'TUTORIA', label: 'Tutorías' },
    { value: 'ACUERDO', label: 'Acuerdos' },
    { value: 'TESIS', label: 'Tesis' },
    { value: 'EVIDENCIA', label: 'Evidencias' },
  ];

  protected get hasVisibleEvents(): boolean {
    return this.semesters.some(semester => this.visibleEvents(semester).length > 0);
  }

  protected visibleEvents(semester: TimelineSemester): TimelineEvent[] {
    return this.filter === 'TODOS' ? semester.eventos : semester.eventos.filter(event => event.tipo === this.filter);
  }

  protected typeLabel(type: TimelineEventType): string {
    return { TUTORIA: 'Tutoría', ACUERDO: 'Acuerdo', TESIS: 'Tesis', EVIDENCIA: 'Evidencia' }[type];
  }

  protected icon(type: TimelineEventType): string {
    return { TUTORIA: '◆', ACUERDO: '✓', TESIS: '▥', EVIDENCIA: '▣' }[type];
  }
}
