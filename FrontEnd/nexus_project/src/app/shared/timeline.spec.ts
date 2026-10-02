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

  const clickFilter = (label: string): void => {
    const button = [...fixture.nativeElement.querySelectorAll('.filters button')].find(
      (b: Element) => (b.textContent ?? '').includes(label),
    ) as HTMLButtonElement;
    button.click();
  };

  const ariaPressed = (label: string): string | null => {
    const button = [...fixture.nativeElement.querySelectorAll('.filters button')].find(
      (b: Element) => (b.textContent ?? '').includes(label),
    ) as HTMLButtonElement;
    return button.getAttribute('aria-pressed');
  };

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

  it('acumula varios filtros a la vez', () => {
    clickFilter('Tutorías');
    clickFilter('Acuerdos');
    fixture.detectChanges();

    expect(titles()).toEqual(['Tutoria junio', 'Acuerdo marzo', 'Tutoria marzo']);
  });

  it('desmarca un filtro sin tocar los demás', () => {
    clickFilter('Tutorías');
    clickFilter('Acuerdos');
    clickFilter('Acuerdos');
    fixture.detectChanges();

    expect(titles()).toEqual(['Tutoria junio', 'Tutoria marzo']);
  });

  it('«Limpiar» restablece todos los tipos', () => {
    clickFilter('Tutorías');
    clickFilter('Tesis');
    fixture.detectChanges();
    expect(titles().length).toBeLessThan(4);

    const limpiar = [...fixture.nativeElement.querySelectorAll('.filters button')].find(
      (b: Element) => (b.textContent ?? '').trim() === 'Limpiar',
    ) as HTMLButtonElement;
    limpiar.click();
    fixture.detectChanges();

    expect(titles().length).toBe(4);
    expect(ariaPressed('Todos')).toBe('true');
  });

  it('avisa de cuántos eventos se están ocultando', () => {
    clickFilter('Tesis');
    fixture.detectChanges();

    const nota = fixture.nativeElement.querySelector('.filter-note');
    expect(nota.textContent).toContain('Mostrando 0 de 4');
    expect(ariaPressed('Tesis')).toBe('true');
  });

  it('el botón «Todos» se marca activo cuando no hay filtros', () => {
    expect(ariaPressed('Todos')).toBe('true');
    expect(ariaPressed('Tutorías')).toBe('false');
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

/** Varios eventos comparten día: los acuerdos heredan la fecha de su sesión. */
const MISMO_DIA: TimelineSemester[] = [
  {
    id: 3,
    numero: 3,
    activo: true,
    eventos: [
      { id: 'T-9', tipo: 'TUTORIA', fecha: '2026-09-25', orden: 0, titulo: 'Sesión 5', descripcion: '', metadata: {} },
      { id: 'A-9', tipo: 'ACUERDO', fecha: '2026-09-25', orden: 1, titulo: 'Acuerdo de la sesión 5', descripcion: '', metadata: {} },
      { id: 'X-9', tipo: 'TESIS', fecha: '2026-09-25', orden: 2, titulo: 'Avance de tesis', descripcion: '', metadata: {} },
      { id: 'E-9', tipo: 'EVIDENCIA', fecha: '2026-09-25', orden: 3, titulo: 'Evidencia', descripcion: '', metadata: {} },
    ],
  },
];

describe('TimelineComponent, orden dentro de un mismo día', () => {
  let fixture: ComponentFixture<TimelineComponent>;

  const titles = (): string[] =>
    [...fixture.nativeElement.querySelectorAll('li.event article h4')].map((h4: Element) => (h4.textContent ?? '').trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TimelineComponent] }).compileComponents();
    fixture = TestBed.createComponent(TimelineComponent);
    fixture.componentRef.setInput('semesters', MISMO_DIA);
    fixture.detectChanges();
  });

  it('respeta la secuencia real del día en vez del orden de llegada', () => {
    // Por defecto va de más reciente a más antiguo, y dentro del día el último evento
    // es el que ocurrió después: evidencia, tesis, acuerdo y por último la sesión.
    expect(titles()).toEqual(['Evidencia', 'Avance de tesis', 'Acuerdo de la sesión 5', 'Sesión 5']);
  });

  it('la lista ascendente es el reflejo exacto de la descendente', () => {
    const asc = [...fixture.nativeElement.querySelectorAll('.order button')].find((b: Element) =>
      (b.textContent ?? '').includes('Más antiguo'),
    ) as HTMLButtonElement;
    asc.click();
    fixture.detectChanges();

    expect(titles()).toEqual(['Sesión 5', 'Acuerdo de la sesión 5', 'Avance de tesis', 'Evidencia']);
  });

  it('mantiene la secuencia cuando el backend no envía `orden`', () => {
    fixture.componentRef.setInput('semesters', [{
      id: 4, numero: 4, activo: true,
      eventos: [
        { id: 'B', tipo: 'ACUERDO', fecha: '2026-09-25', titulo: 'Acuerdo', descripcion: '', metadata: {} },
        { id: 'A', tipo: 'TUTORIA', fecha: '2026-09-25', titulo: 'Sesión', descripcion: '', metadata: {} },
      ],
    }]);
    fixture.detectChanges();

    // Sin `orden` se usa la posición de llegada, que es el orden real del backend.
    expect(titles()).toEqual(['Sesión', 'Acuerdo']);
  });
});