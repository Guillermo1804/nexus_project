import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { AuthService } from '../core/auth/auth.service';
import { TutoringConditionsComponent } from './tutoring-conditions';

interface TestTutoringConditions {
  nextMeetingForm: any;
  guardarProximaReunion: () => void;
  guardarCondiciones: () => void;
}

describe('TutoringConditionsComponent (HU-10)', () => {
  let fixture: ComponentFixture<TutoringConditionsComponent>;
  let component: TestTutoringConditions;
  let updateNextMeeting: jasmine.Spy;
  let registrarParticipanteTutoria: jasmine.Spy;

  beforeEach(async () => {
    updateNextMeeting = jasmine.createSpy('updateNextMeeting').and.returnValue(of({ id: 12 }));
    registrarParticipanteTutoria = jasmine.createSpy('registrarParticipanteTutoria').and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [TutoringConditionsComponent],
      providers: [
        {
          provide: AcademicService,
          useValue: {
            getParticipantesTutoria: jasmine.createSpy('getParticipantesTutoria').and.returnValue(of([])),
            registrarParticipanteTutoria,
            updateNextMeeting,
          },
        },
        {
          provide: AuthService,
          useValue: { hasPermission: (permission: string) => permission === 'tutoring.create' },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TutoringConditionsComponent);
    fixture.componentRef.setInput('tutoriaId', 12);
    fixture.componentRef.setInput('fechaSesion', '2026-09-15');
    fixture.componentRef.setInput('proximaReunionFecha', '2026-10-20');
    fixture.componentRef.setInput('proximaReunionNotas', 'Llevar avances.');
    fixture.componentRef.setInput('estudiante', {
      id: 10,
      user_id: 30,
      matricula: 'DOC-10',
      nombre_completo: 'Estudiante Prueba',
      programa_doctoral: 'Doctorado',
      cohorte: '2026',
      fecha_ingreso: '2026-01-01',
      estatus_activo: true,
    });
    fixture.componentRef.setInput('asesores', { advisor: null, coadvisor: null, members: [] });
    fixture.detectChanges();
    component = fixture.componentInstance as unknown as TestTutoringConditions;
  });

  it('carga la programación existente', () => {
    expect(component.nextMeetingForm.getRawValue()).toEqual({
      proxima_reunion_fecha: '2026-10-20',
      proxima_reunion_notas: 'Llevar avances.',
    });
  });

  it('permite guardar notas sin fecha de próxima reunión', () => {
    component.nextMeetingForm.setValue({
      proxima_reunion_fecha: '',
      proxima_reunion_notas: 'Preparar resultados.',
    });

    expect(component.nextMeetingForm.valid).toBeTrue();
    component.guardarProximaReunion();
    expect(updateNextMeeting).toHaveBeenCalled();
  });

  it('rechaza fechas pasadas y el día actual', () => {
    const today = (fixture.componentInstance as unknown as { today: string }).today;
    component.nextMeetingForm.patchValue({ proxima_reunion_fecha: today });

    expect(component.nextMeetingForm.hasError('dateNotFuture')).toBeTrue();
    component.guardarProximaReunion();
    expect(updateNextMeeting).not.toHaveBeenCalled();
  });

  it('configura el selector para aceptar únicamente fechas futuras', () => {
    const today = (fixture.componentInstance as unknown as { today: string }).today;
    const [year, month, day] = today.split('-').map(Number);
    const tomorrow = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
    const dateInput: HTMLInputElement = fixture.nativeElement.querySelector('#next-meeting-date');

    expect(dateInput.min).toBe(tomorrow);
  });

  it('limita las notas a 500 caracteres', () => {
    component.nextMeetingForm.patchValue({ proxima_reunion_notas: 'a'.repeat(501) });

    expect(component.nextMeetingForm.controls.proxima_reunion_notas.hasError('maxlength')).toBeTrue();
  });

  it('guarda mediante PATCH y no registra participantes', () => {
    component.nextMeetingForm.setValue({
      proxima_reunion_fecha: '2026-11-01',
      proxima_reunion_notas: '  Preparar resultados.  ',
    });
    component.guardarProximaReunion();

    expect(updateNextMeeting).toHaveBeenCalledWith(12, {
      proxima_reunion_fecha: '2026-11-01',
      proxima_reunion_notas: 'Preparar resultados.',
    });
    expect(registrarParticipanteTutoria).not.toHaveBeenCalled();
  });

  it('permite dejar la programación vacía', () => {
    component.nextMeetingForm.setValue({
      proxima_reunion_fecha: '',
      proxima_reunion_notas: '',
    });
    component.guardarProximaReunion();

    expect(updateNextMeeting).toHaveBeenCalledWith(12, {
      proxima_reunion_fecha: null,
      proxima_reunion_notas: '',
    });
  });
});
