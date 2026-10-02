import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimelineSemester } from '../core/academic/academic.models';
import { TimelineComponent } from './timeline';

const SEMESTERS: TimelineSemester[] = [
  {
    id: 1,
    numero: 1,
    activo: false,
    eventos: [
      { id: 'T-1', tipo: 'TUTORIA', fecha: '2026-03-05', titulo: 'Tutoria marzo', descripcion: '', metadata: {} },
      { id: 'A-1', tipo: 'ACUERDO', fecha: '2026-03-10', titulo: 'Acuerdo marzo', descripcion: '', metadata: {} },
    ],
  },
  {
    id: 2,
    numero: 2,
    activo: true,
    eventos: [
      { id: 'E-1', tipo: 'EVIDENCIA', fecha: '2026-05-01', titulo: 'Evidencia mayo', descripcion: '', metadata: {} },
      { id: 'T-2', tipo: 'TUTORIA', fecha: '2026-06-01', titulo: 'Tutoria junio', descripcion: '', metadata: {} },
    ],
  },
];

describe('TimelineComponent (HU-23)', () => {
  let fixture: ComponentFixture<TimelineComponent>;

  const titles = (): string[] =>
    [...fixture.nativeElement.querySelectorAll('li.event article h4')].map((h4: Element) => (h4.textContent ?? '').trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TimelineComponent] }).compileComponents();
    fixture = TestBed.createComponent(TimelineComponent);
    fixture.componentRef.setInput('semesters', SEMESTERS);
    fixture.detectChanges();
  });

  it('muestra primero el evento más reciente, sin agrupar por semestre', () => {
    expect(titles()).toEqual(['Tutoria junio', 'Evidencia mayo', 'Acuerdo marzo', 'Tutoria marzo']);
    expect(fixture.nativeElement.querySelectorAll('.semester-group').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('ol[aria-label="Trayectoria cronológica del estudiante"]').length).toBe(1);
  });

  it('permite invertir el orden a más antiguo primero', () => {
    const ascButton = [...fixture.nativeElement.querySelectorAll('.order button')].find((b: Element) =>
      (b.textContent ?? '').includes('Más antiguo'),
    ) as HTMLButtonElement;
    ascButton.click();
    fixture.detectChanges();

    expect(titles()).toEqual(['Tutoria marzo', 'Acuerdo marzo', 'Evidencia mayo', 'Tutoria junio']);
  });

  it('conserva el orden elegido al filtrar por tipo', () => {
    const ascButton = [...fixture.nativeElement.querySelectorAll('.order button')].find((b: Element) =>
      (b.textContent ?? '').includes('Más antiguo'),
    ) as HTMLButtonElement;
    ascButton.click();
    const filterButton = [...fixture.nativeElement.querySelectorAll('.filters button')].find(
      (b: Element) => (b.textContent ?? '').includes('Tutorías'),
    ) as HTMLButtonElement;
    filterButton.click();
    fixture.detectChanges();

    expect(titles()).toEqual(['Tutoria marzo', 'Tutoria junio']);
  });

  it('conserva el semestre de cada evento como referencia sin agrupar', () => {
    const perEvent = [...fixture.nativeElement.querySelectorAll('li.event')].map((li: Element) =>
      [...li.querySelectorAll('.semester-badge')].map((badge: Element) => (badge.textContent ?? '').replace(/\s+/g, ' ').trim()),
    );

    expect(perEvent).toEqual([['Semestre 2', 'Actual'], ['Semestre 2', 'Actual'], ['Semestre 1'], ['Semestre 1']]);
  });

  it('informa cuando el filtro no deja eventos visibles', () => {
    const tesisButton = [...fixture.nativeElement.querySelectorAll('.filters button')].find(
      (b: Element) => (b.textContent ?? '').includes('Tesis'),
    ) as HTMLButtonElement;
    tesisButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.empty')?.textContent).toContain('No hay eventos');
  });
});