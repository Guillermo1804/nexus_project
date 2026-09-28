import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { TutoringAgreementsComponent } from './tutoring-agreements';
import { AcademicService } from '../core/academic/academic.service';
import { AuthService } from '../core/auth/auth.service';

describe('TutoringAgreementsComponent (HU-11 / HU-12)', () => {
  let fixture: ComponentFixture<TutoringAgreementsComponent>;
  let component: TutoringAgreementsComponent;

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
            semester: 1,
            fecha_sesion: '2026-09-05',
            modalidad: 'PRESENCIAL',
            resumen: 'Avance',
            created_by: 2,
          },
        ],
      }),
    ),
    getSessionAgreements: jasmine.createSpy('getSessionAgreements').and.returnValue(
      of([
        {
          id: 85,
          student: 4,
          session: 12,
          descripcion: 'Entregar capítulo 3 preliminar completo.',
          responsable: 2,
          responsable_nombre: 'Roberto Gómez',
          fecha_limite: '2026-09-30',
          estado: 'PENDIENTE' as const,
          is_vencido: false,
        },
      ]),
    ),
    createSessionAgreement: jasmine.createSpy('createSessionAgreement').and.returnValue(
      of({
        id: 86,
        student: 4,
        session: 12,
        descripcion: 'Nueva tarea de seguimiento académico.',
        responsable: 4,
        responsable_nombre: 'Ana Morales',
        fecha_limite: '2026-10-15',
        estado: 'PENDIENTE' as const,
        is_vencido: false,
      }),
    ),
    updateAgreementStatus: jasmine.createSpy('updateAgreementStatus').and.returnValue(
      of({
        id: 85,
        student: 4,
        session: 12,
        descripcion: 'Entregar capítulo 3 preliminar completo.',
        responsable: 2,
        responsable_nombre: 'Roberto Gómez',
        fecha_limite: '2026-09-30',
        estado: 'EN_PROCESO' as const,
        is_vencido: false,
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
      imports: [TutoringAgreementsComponent],
      providers: [
        { provide: AcademicService, useValue: academicStub },
        { provide: AuthService, useValue: authStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TutoringAgreementsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('studentId', 4);
    fixture.componentRef.setInput('preferredSessionId', 12);
    fixture.componentRef.setInput('responsibleOptions', [
      { id: 4, nombre_completo: 'Ana Morales', etiqueta: 'Estudiante' },
      { id: 2, nombre_completo: 'Roberto Gómez', etiqueta: 'Asesor' },
    ]);
    authStub.user.set({
      id: 2,
      email: 'roberto.gomez@nexus.edu',
      first_name: 'Roberto',
      last_name: 'Gómez',
      role: 'TUTOR',
      roles: ['TUTOR'],
      permissions: ['tutoring.create', 'records.read.assigned'],
    });
    fixture.detectChanges();
  });

  it('lista acuerdos con responsable y fecha (HU-11/12)', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(academicStub.getSessionAgreements).toHaveBeenCalledWith(12);
    expect(text).toContain('Entregar capítulo 3 preliminar completo.');
    expect(text).toContain('PENDIENTE');
    expect(text).toContain('Roberto Gómez');
    expect(text).toContain('2026-09-30');
    expect(text).toContain('Pasar a EN PROCESO');
  });

  it('crea acuerdo con responsable y fecha explícitos (HU-12)', () => {
    academicStub.createSessionAgreement.calls.reset();
    component['form'].setValue({
      descripcion: 'Nueva tarea de seguimiento académico.',
      responsable: 4,
      fecha_limite: '2026-10-15',
    });
    component['submit']();
    expect(academicStub.createSessionAgreement).toHaveBeenCalled();
    const [sessionId, payload] = academicStub.createSessionAgreement.calls.mostRecent().args;
    expect(sessionId).toBe(12);
    expect(payload.descripcion).toBe('Nueva tarea de seguimiento académico.');
    expect(payload.responsable).toBe(4);
    expect(payload.fecha_limite).toBe('2026-10-15');
  });

  it('rechaza fecha límite anterior a la tutoría (HU-12)', () => {
    academicStub.createSessionAgreement.calls.reset();
    component['form'].setValue({
      descripcion: 'Nueva tarea de seguimiento académico.',
      responsable: 2,
      fecha_limite: '2026-09-01',
    });
    component['submit']();
    expect(academicStub.createSessionAgreement).not.toHaveBeenCalled();
    expect(component['error']).toContain('fecha límite');
  });

  it('permite al responsable avanzar el estado (HU-13)', () => {
    academicStub.updateAgreementStatus.calls.reset();
    const agreement = component['agreements'][0];
    expect(component['puedeActualizarEstado'](agreement)).toBeTrue();
    component['actualizarEstado'](agreement);
    expect(academicStub.updateAgreementStatus).toHaveBeenCalledWith(85, 'EN_PROCESO');
  });

  it('no muestra acción de estado si el usuario no es responsable (HU-13)', () => {
    authStub.user.set({
      id: 99,
      email: 'otro@nexus.edu',
      first_name: 'Otro',
      last_name: 'Usuario',
      role: 'TUTOR',
      roles: ['TUTOR'],
      permissions: ['tutoring.create', 'records.read.assigned'],
    });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('Pasar a');
  });
});
