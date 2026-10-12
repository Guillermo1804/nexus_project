import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { TutoringFormComponent } from './tutoring-form';

interface TestTutoringForm {
  form: any;
  submit: () => void;
  error: string;
}

describe('TutoringFormComponent (HU-07)', () => {
  let fixture: ComponentFixture<TutoringFormComponent>;
  let component: TestTutoringForm;
  let createTutoringSession: jasmine.Spy;

  beforeEach(async () => {
    createTutoringSession = jasmine.createSpy('createTutoringSession').and.returnValue(of({ id: 1 }));
    await TestBed.configureTestingModule({
      imports: [TutoringFormComponent],
      providers: [{ provide: AcademicService, useValue: { createTutoringSession } }],
    }).compileComponents();

    fixture = TestBed.createComponent(TutoringFormComponent);
    fixture.componentRef.setInput('studentId', 10);
    fixture.componentRef.setInput('semesters', [{
      id: 2,
      student: 10,
      numero: 2,
      fecha_inicio: '2026-01-01',
      fecha_fin: '2026-06-30',
      is_active: true,
      tutoring_sessions: [],
    }]);
    fixture.detectChanges();
    component = fixture.componentInstance as unknown as TestTutoringForm;
  });

  it('rechaza un resumen con menos de 10 caracteres significativos', () => {
    component.form.patchValue({ resumen: '   corto   ' });
    component.submit();

    expect(component.form.controls.resumen.hasError('significantMinLength')).toBeTrue();
    expect(createTutoringSession).not.toHaveBeenCalled();
  });

  it('rechaza una fecha de sesión pasada', () => {
    component.form.patchValue({ fecha_sesion: '2025-12-31', resumen: 'Resumen valido' });
    component.submit();

    expect(component.form.controls.fecha_sesion.hasError('pastDate')).toBeTrue();
    expect(createTutoringSession).not.toHaveBeenCalled();
  });

  it('no muestra campos de HU-10 en el registro de tutoría', () => {
    expect(fixture.nativeElement.querySelector('#tut-prox-fecha')).toBeNull();
    expect(fixture.nativeElement.querySelector('#tut-prox-notas')).toBeNull();
  });

  it('envia una sesion valida sin campos de próxima reunión', () => {
    component.form.patchValue({ fecha_sesion: '2099-02-01', resumen: 'Resumen valido' });
    component.submit();

    expect(createTutoringSession).toHaveBeenCalledWith({
      student: 10,
      semester: 2,
      fecha_sesion: '2099-02-01',
      modalidad: 'PRESENCIAL',
      resumen: 'Resumen valido',
    });
  });
});
