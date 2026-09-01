import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimelineComponent } from './timeline.component';
import { MonitoringService } from '../../../core/services/monitoring.service';
import { of } from 'rxjs';
import { TimelineEvent } from '../../../core/models/timeline.model';

describe('TimelineComponent', () => {
  let component: TimelineComponent;
  let fixture: ComponentFixture<TimelineComponent>;
  let mockMonitoringService: jasmine.SpyObj<MonitoringService>;

  const mockEvents: TimelineEvent[] = [
    {
      id: 'tutoria-1',
      tipo: 'TUTORIA',
      titulo: 'Sesión de Tutoría (Presencial)',
      descripcion: 'Revisión semestral',
      fecha: '2025-02-20',
      estado: 'CONCLUIDA',
      icono: '📘',
      color: '#6365EF',
      metadata: {
        modalidad: 'PRESENCIAL',
        participantes: [{ nombre: 'Dr. Asesor', rol: 'Asesor Principal', asistencia: true }]
      }
    },
    {
      id: 'acuerdo-1',
      tipo: 'ACUERDO',
      titulo: 'Acuerdo: Entrega de borrador',
      descripcion: 'Entregar protocolo',
      fecha: '2025-02-22',
      estado: 'PENDIENTE',
      icono: '📝',
      color: '#57949D',
      metadata: {
        responsable: 'Juan Pérez',
        fecha_limite: '2025-02-22'
      }
    },
    {
      id: 'publicacion-1',
      tipo: 'PUBLICACION',
      titulo: 'Publicación: Deep Learning for Healthcare',
      descripcion: 'Artículo JCR en IEEE Transactions',
      fecha: '2025-02-25',
      estado: 'PUBLICADO',
      icono: '🎓',
      color: '#6365EF',
      metadata: {
        revista_editorial: 'IEEE Transactions',
        doi_url: 'https://doi.org/10.1109/test',
        autores: 'Juan Pérez, Dra. Elena Vargas'
      }
    }
  ];

  beforeEach(async () => {
    mockMonitoringService = jasmine.createSpyObj('MonitoringService', ['getTimeline']);
    mockMonitoringService.getTimeline.and.returnValue(of({
      student_id: 1,
      total_eventos: 3,
      timeline: mockEvents
    }));

    await TestBed.configureTestingModule({
      imports: [TimelineComponent],
      providers: [
        { provide: MonitoringService, useValue: mockMonitoringService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TimelineComponent);
    component = fixture.componentInstance;
  });

  it('should create the timeline component', () => {
    expect(component).toBeTruthy();
  });

  it('should load timeline on init when studentId is passed', () => {
    component.studentId = 1;
    component.ngOnInit();
    expect(mockMonitoringService.getTimeline).toHaveBeenCalledWith(1);
    expect(component.events().length).toBe(3);
  });

  it('should filter events when filter is set', () => {
    component.events.set(mockEvents);
    component.setFilter('ACUERDO');
    expect(component.filteredEvents().length).toBe(1);
    expect(component.filteredEvents()[0].tipo).toBe('ACUERDO');

    component.setFilter('PUBLICACION');
    expect(component.filteredEvents().length).toBe(1);
    expect(component.filteredEvents()[0].tipo).toBe('PUBLICACION');
  });

  it('should calculate counts correctly for all types', () => {
    component.events.set(mockEvents);
    const counts = component.counts();
    expect(counts.TODOS).toBe(3);
    expect(counts.TUTORIA).toBe(1);
    expect(counts.ACUERDO).toBe(1);
    expect(counts.PUBLICACION).toBe(1);
    expect(counts.CONGRESO).toBe(0);
  });

  it('should open and close flyout drawer on event click', () => {
    component.openDrawer(mockEvents[2]);
    expect(component.isDrawerOpen()).toBeTrue();
    expect(component.selectedEvent()?.id).toBe('publicacion-1');

    component.closeDrawer();
    expect(component.isDrawerOpen()).toBeFalse();
    expect(component.selectedEvent()).toBeNull();
  });
});
