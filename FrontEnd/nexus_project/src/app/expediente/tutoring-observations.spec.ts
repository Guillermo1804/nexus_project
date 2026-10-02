import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { TutoringObservationsComponent } from './tutoring-observations';
import { AcademicService } from '../core/academic/academic.service';
import { AuthService } from '../core/auth/auth.service';

describe('TutoringObservationsComponent (HU-09)', () => {
  let fixture: ComponentFixture<TutoringObservationsComponent>;
  let component: TutoringObservationsComponent;

  const academicStub = {
    getTutoringSessions: jasmine.createSpy('getTutoringSessions').and.returnValue(
      of({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 12,
            student: 4,
            semester: 3,
            fecha_sesion: '2026-09-05',
            modalidad: 'PRESENCIAL',
            resumen: 'Revisión de protocolo',
            created_by: 2,
          },
        ],
      }),
    ),
    getSessionObservations: jasmine.createSpy('getSessionObservations').and.returnValue(
      of([
        {
          id: 1,
          session: 12,
          autor: 2,
          autor_nombre: 'Roberto Gómez',
          tema_revisado: 'Metodología',
          observaciones_detalladas: 'Ampliar el marco teórico con fuentes recientes.',
          created_at: '2026-09-14T11:30:00Z',
        },
      ]),
    ),
    createSessionObservation: jasmine.createSpy('createSessionObservation').and.returnValue(
      of({
        id: 2,
        session: 12,
        autor: 2,
        autor_nombre: 'Roberto Gómez',
        tema_revisado: 'Estado del arte',
        observaciones_detalladas: 'Incluir literatura 2024-2026 sobre el tema.',
        created_at: '2026-09-15T12:00:00Z',
      }),
    ),
  };

  const authStub = {
    user: signal({
      id: 2,
      email: 'roberto.gomez@nexus.edu',
      first_name: 'Roberto',
      last_name: 'Gómez',
      role: 'TUTOR',
      roles: ['TUTOR'],
      permissions: ['tutoring.create', 'records.read.assigned'],
    }),
    hasPermission: (p: string) => p === 'tutoring.create' || p === 'records.read.assigned',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutoringObservationsComponent],
      providers: [
        { provide: AcademicService, useValue: academicStub },
        { provide: AuthService, useValue: authStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TutoringObservationsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('studentId', 4);
    fixture.componentRef.setInput('preferredSessionId', 12);
    fixture.detectChanges();
  });

  it('carga tutorías y muestra observaciones existentes', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(academicStub.getTutoringSessions).toHaveBeenCalled();
    expect(academicStub.getSessionObservations).toHaveBeenCalledWith(12);
    expect(text).toContain('Metodología');
    expect(text).toContain('Roberto Gómez');
  });

  it('registra una nueva observación en la sesión seleccionada', () => {
    academicStub.createSessionObservation.calls.reset();
    academicStub.getSessionObservations.calls.reset();
    component['form'].setValue({
      tema_revisado: 'Estado del arte',
      observaciones_detalladas: 'Incluir literatura 2024-2026 sobre el tema.',
    });
    component['submit']();
    expect(academicStub.createSessionObservation).toHaveBeenCalledWith(12, {
      tema_revisado: 'Estado del arte',
      observaciones_detalladas: 'Incluir literatura 2024-2026 sobre el tema.',
    });
    expect(academicStub.getSessionObservations).toHaveBeenCalled();
  });
});

describe('TutoringObservationsComponent, tutorías que aún no han ocurrido', () => {
  const manana = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };
  const ayer = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };

  const sesion = (id: number, fecha: string) => ({
    id, student: 4, semester: 3, fecha_sesion: fecha,
    modalidad: 'VIRTUAL', resumen: 'Sesión', created_by: 2,
  });

  /**
   * El stub se construye por test: Jasmine ejecuta los specs en orden aleatorio y
   * mutar uno compartido hacía fallar los demás según el orden de salida.
   */
  function montar(sesiones: unknown[]): { fixture: ComponentFixture<TutoringObservationsComponent>; component: TutoringObservationsComponent } {
    const academicStub = {
      getTutoringSessions: jasmine.createSpy('getTutoringSessions').and.returnValue(
        of({ count: sesiones.length, next: null, previous: null, results: sesiones }),
      ),
      getSessionObservations: jasmine.createSpy('getSessionObservations').and.returnValue(of([])),
      createSessionObservation: jasmine.createSpy('createSessionObservation'),
    };
    TestBed.configureTestingModule({
      imports: [TutoringObservationsComponent],
      providers: [
        { provide: AcademicService, useValue: academicStub },
        { provide: AuthService, useValue: { user: signal(null), hasPermission: () => true } },
      ],
    });
    const fixture = TestBed.createComponent(TutoringObservationsComponent);
    fixture.componentRef.setInput('studentId', 4);
    fixture.componentRef.setInput('preferredSessionId', 30);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('no ofrece en el desplegable una tutoría que todavía no ha ocurrido', () => {
    const { fixture, component } = montar([sesion(30, manana()), sesion(12, ayer())]);

    expect(component['sessions'].map((s: { id: number }) => s.id)).toEqual([12]);
    expect(component['futureSessions']).toBe(1);

    const opciones = [...fixture.nativeElement.querySelectorAll('select option')].map(
      (o: Element) => (o.textContent ?? '').trim(),
    );
    expect(opciones.length).toBe(1);
    expect(opciones[0]).toContain(ayer());
  });

  it('selecciona por defecto la tutoría realizada, no la programada', () => {
    const { component } = montar([sesion(30, manana()), sesion(12, ayer())]);

    // Aunque se pida la 30 como preferida, al ser futura no es seleccionable.
    expect(component['selectedSessionId']).toBe(12);
  });

  it('explica por qué no hay nada que documentar si sólo hay tutorías futuras', () => {
    const { fixture } = montar([sesion(30, manana())]);

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('programada');
    expect(texto).toContain('cuando la sesión ocurre');
    expect(fixture.nativeElement.querySelector('.observation-form')).toBeNull();
  });
});
