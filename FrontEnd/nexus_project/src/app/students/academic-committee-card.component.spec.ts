import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ComponentRef } from '@angular/core';
import { AcademicCommitteeCardComponent } from './academic-committee-card.component';
import { StudentRecord } from '../core/academic/academic.models';

describe('AcademicCommitteeCardComponent', () => {
  let component: AcademicCommitteeCardComponent;
  let componentRef: ComponentRef<AcademicCommitteeCardComponent>;
  let fixture: ComponentFixture<AcademicCommitteeCardComponent>;

  const mockStudent: StudentRecord = {
    id: 5,
    matricula: 'DOC-2026-055',
    nombre_completo: 'Laura Méndez',
    programa_doctoral: 'Doctorado en Ciencias',
    cohorte: '2026-B',
    estatus_activo: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademicCommitteeCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AcademicCommitteeCardComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('student', mockStudent);
    fixture.detectChanges();
  });

  it('debe renderizar la tarjeta del estudiante con matricula y nombre', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('DOC-2026-055');
    expect(el.textContent).toContain('Laura Méndez');
    expect(el.textContent).toContain('Doctorado en Ciencias');
    expect(el.textContent).toContain('ACTIVO');
  });

  it('debe contener enlace al expediente correspondiente', () => {
    const link = fixture.nativeElement.querySelector('a.btn-expediente');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/expediente/5');
  });
});
