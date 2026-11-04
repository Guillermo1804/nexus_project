import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AcademicService } from '../core/academic/academic.service';
import { typeLabel } from '../core/academic/academic.models';
import { OtherProductFormComponent } from './other-product-form';

describe('OtherProductFormComponent', () => {
  let fixture: ComponentFixture<OtherProductFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OtherProductFormComponent],
      providers: [{ provide: AcademicService, useValue: {} }],
    }).compileComponents();

    fixture = TestBed.createComponent(OtherProductFormComponent);
    fixture.componentRef.setInput('studentId', 1);
    fixture.componentRef.setInput('semesterId', 1);
    fixture.detectChanges();
  });

  it('muestra los tipos de producto sin emojis', () => {
    const options = Array.from(
      fixture.nativeElement.querySelectorAll('#tipo_producto option'),
    ) as HTMLOptionElement[];

    expect(options.map((option) => option.textContent?.trim())).toEqual([
      'Seleccione un tipo',
      'Software',
      'Patente',
      'Base de datos',
      'Prototipo',
      'Capítulo de libro',
      'Otro',
    ]);
  });

  it('devuelve el nombre del tipo sin emojis para la vista de productos', () => {
    expect(typeLabel('PATENTE')).toBe('Patente');
  });
});
