import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { ThesisProgressFormComponent } from './thesis-progress-form';

type TestForm = {
  form: any;
  setComponentValue: (key: string, raw: string) => void;
  normalizeComponent: (key: string) => void;
  submit: () => void;
};

describe('ThesisProgressFormComponent (HU-15)', () => {
  let fixture: ComponentFixture<ThesisProgressFormComponent>;
  let component: TestForm;
  let createThesisProgress: jasmine.Spy;

  const numbers = (): HTMLInputElement[] => [...fixture.nativeElement.querySelectorAll('.component-number')];
  const sliders = (): HTMLInputElement[] => [...fixture.nativeElement.querySelectorAll('.slider-row input[type="range"]')];

  const type = (input: HTMLInputElement, value: string): void => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    createThesisProgress = jasmine.createSpy('createThesisProgress').and.returnValue(of({ id: 5 }));

    await TestBed.configureTestingModule({
      imports: [ThesisProgressFormComponent],
      providers: [{ provide: AcademicService, useValue: { createThesisProgress } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ThesisProgressFormComponent);
    fixture.componentRef.setInput('studentId', 10);
    fixture.componentRef.setInput('semesterId', 4);
    fixture.componentRef.setInput('currentPercentage', 40);
    fixture.componentRef.setInput('currentComponents', { metodologia: 30 });
    fixture.detectChanges();
    component = fixture.componentInstance as unknown as TestForm;
  });

  it('ofrece un campo numérico editable junto a cada uno de los seis componentes', () => {
    expect(numbers().length).toBe(6);
    expect(sliders().length).toBe(6);
    expect(numbers().map((input) => input.getAttribute('type'))).toEqual(Array(6).fill('number'));
  });

  it('muestra el porcentaje ya registrado en cada campo numérico', () => {
    expect(numbers().map((input) => input.value)).toEqual(['0', '0', '30', '0', '0', '0']);
  });

  it('escribir un porcentaje actualiza el control y el deslizador', () => {
    type(numbers()[2], '65');

    expect(component.form.controls.componentes_json.controls.metodologia.value).toBe(65);
    expect(sliders()[2].value).toBe('65');
  });

  it('el deslizador y el campo numérico comparten el mismo valor', () => {
    component.form.controls.componentes_json.controls.metodologia.setValue(42);
    fixture.detectChanges();

    expect(component.form.getRawValue().componentes_json.metodologia).toBe(42);
  });

  it('refleja en el campo numérico el valor movido con el deslizador', () => {
    component.form.controls.componentes_json.controls.metodologia.setValue(55);
    fixture.detectChanges();

    expect(numbers()[2].value).toBe('55');
    expect(sliders()[2].value).toBe('55');
  });

  it('no sobrescribe lo que se está escribiendo en el campo numérico', () => {
    const input = numbers()[2];
    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    type(input, '7');

    expect(component.form.controls.componentes_json.controls.metodologia.value).toBe(7);
    expect(numbers()[2].value).toBe('7');
  });

  it('acota los valores escritos fuera del rango 0 a 100', () => {
    type(numbers()[2], '150');
    expect(component.form.controls.componentes_json.controls.metodologia.value).toBe(100);

    type(numbers()[2], '-20');
    expect(component.form.controls.componentes_json.controls.metodologia.value).toBe(0);
  });

  it('descarta la edición abandonada y vuelve al valor guardado al salir del campo', () => {
    const input = numbers()[2];
    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    type(input, '');
    expect(component.form.controls.componentes_json.controls.metodologia.value).toBe(30);

    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(numbers()[2].value).toBe('30');
  });

  it('envía los porcentajes escritos por componente', () => {
    type(numbers()[0], '10');
    type(numbers()[2], '55');

    component.submit();

    expect(createThesisProgress).toHaveBeenCalledTimes(1);
    const payload = createThesisProgress.calls.mostRecent().args[0];
    expect(payload.componentes_json.protocolo).toBe(10);
    expect(payload.componentes_json.metodologia).toBe(55);
    expect(payload.student).toBe(10);
    expect(payload.semester).toBe(4);
  });
});