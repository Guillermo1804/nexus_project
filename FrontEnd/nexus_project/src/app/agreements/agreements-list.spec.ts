import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { AgreementsListComponent } from './agreements-list';
import { AcademicService } from '../core/academic/academic.service';
import { AuthService } from '../core/auth/auth.service';
import { StudentService } from '../core/students/student.service';
import { AuthenticatedUser } from '../core/auth/auth.models';

describe('AgreementsListComponent (HU-14)', () => {
  let fixture: ComponentFixture<AgreementsListComponent>;
  let component: AgreementsListComponent;

  const userSignal = signal<AuthenticatedUser | null>({
    id: 1,
    email: 'coord@nexus.edu',
    first_name: 'Coord',
    last_name: 'Demo',
    role: 'PROGRAM_COORDINATOR',
    roles: ['PROGRAM_COORDINATOR'],
    permissions: ['academic.read.global'],
  });

  const academicStub = {
    getAgreements: jasmine.createSpy('getAgreements').and.returnValue(
      of({
        count: 2,
        next: null,
        previous: null,
        results: [
          {
            id: 85,
            student: 4,
            student_nombre: 'Diego Fuentes',
            student_matricula: 'DOC250002',
            session: 12,
            semester: 3,
            semester_numero: 2,
            descripcion: 'Entregar capítulo 3',
            responsable: 15,
            responsable_nombre: 'Diego Fuentes',
            fecha_limite: '2026-08-30',
            estado: 'PENDIENTE',
            is_vencido: true,
          },
          {
            id: 86,
            student: 4,
            student_nombre: 'Diego Fuentes',
            student_matricula: 'DOC250002',
            session: 12,
            semester: 3,
            semester_numero: 2,
            descripcion: 'Entregar capítulo 4',
            responsable: 15,
            responsable_nombre: 'Diego Fuentes',
            fecha_limite: '2099-10-30',
            estado: 'PENDIENTE',
            is_vencido: false,
          },
        ],
      }),
    ),
    getGlobalOverview: jasmine.createSpy('getGlobalOverview').and.returnValue(
      of({ count: 1, next: null, previous: null, results: [{ id: 4, matricula: 'DOC250002', nombre_completo: 'Diego Fuentes', programa_doctoral: 'DCC', cohorte: '2025', estatus_activo: true }] }),
    ),
    getStudentSemesters: jasmine.createSpy('getStudentSemesters').and.returnValue(
      of([{ id: 3, student: 4, numero: 2, fecha_inicio: '2026-01-01', fecha_fin: '2026-06-30', is_active: true }]),
    ),
    getAgreementAuditLog: jasmine.createSpy('getAgreementAuditLog').and.returnValue(of([])),
    updateAgreementStatus: jasmine.createSpy('updateAgreementStatus').and.returnValue(of({})),
  };

  const authStub = {
    user: userSignal,
    hasPermission: (p: string) => p === 'academic.read.global',
  };

  const studentStub = {
    getStudents: jasmine.createSpy('getStudents').and.returnValue(of({ count: 0, next: null, previous: null, results: [] })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgreementsListComponent],
      providers: [
        provideRouter([]),
        { provide: AcademicService, useValue: academicStub },
        { provide: AuthService, useValue: authStub },
        { provide: StudentService, useValue: studentStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgreementsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga y muestra acuerdos vencidos', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(academicStub.getAgreements).toHaveBeenCalled();
    expect(text).toContain('Entregar capítulo 3');
    // Los estados se muestran en lenguaje natural, no como la constante del backend.
    expect(text).toContain('Vencido');
    expect(text).toContain('Diego Fuentes');
  });

  it('abre la edición y guarda únicamente la siguiente transición', () => {
    const agreement = component['agreements'][1];
    component['abrirEdicion'](agreement);

    expect(component['isStatusEnabled']('EN_PROCESO')).toBeTrue();
    expect(component['isStatusEnabled']('CONCLUIDO')).toBeFalse();

    component['selectStatus']('EN_PROCESO');
    component['comentario'] = 'Inicio de avance';
    component['guardarCambios']();

    expect(academicStub.updateAgreementStatus).toHaveBeenCalledWith(86, 'EN_PROCESO', 'Inicio de avance');
  });

  it('un clic en un acuerdo vencido abre la bitácora en vez de no hacer nada', () => {
    // Antes el botón iba deshabilitado y sólo explicaba el motivo en un `title` de
    // hover, que en móvil no existe: el clic no respondía y parecía una aplicación
    // colgada. Ahora responde siempre.
    academicStub.getAgreementAuditLog.calls.reset();
    component['abrirEdicion'](component['agreements'][0]);

    expect(component['drawerAgreement']).not.toBeNull();
    expect(component['drawerMode']).toBe('audit');
    expect(academicStub.getAgreementAuditLog).toHaveBeenCalled();
  });

  it('marca el botón del acuerdo vencido y lo etiqueta como lectura', () => {
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    const vencidoBtn = rows[0].querySelector('.row-actions button') as HTMLButtonElement;
    const vigenteBtn = rows[1].querySelector('.row-actions button') as HTMLButtonElement;

    expect(vencidoBtn.disabled).withContext('un clic nunca debe quedar muerto').toBeFalse();
    expect(vencidoBtn.textContent?.trim()).toContain('Revisar');
    expect(vencidoBtn.classList).toContain('locked');
    expect(vencidoBtn.title).toContain('sólo lectura');
    expect(vigenteBtn.textContent?.trim()).toBe('Editar');
    expect(vigenteBtn.disabled).toBeFalse();
  });

  it('aplica filtros combinados al endpoint', () => {
    academicStub.getAgreements.calls.reset();
    component['filtroStudent'] = '4';
    component['filtroSemester'] = '3';
    component['estadosSeleccionados'] = ['VENCIDO'];
    component['filtroResponsable'] = '15';
    component['filtroFechaDesde'] = '2026-01-01';
    component['filtroFechaHasta'] = '2026-12-31';
    component['aplicarFiltros']();

    expect(academicStub.getAgreements).toHaveBeenCalledWith(
      jasmine.objectContaining({
        limit: 10,
        offset: 0,
        student: 4,
        semester: 3,
        responsable: 15,
        estados: 'VENCIDO',
        fecha_desde: '2026-01-01',
        fecha_hasta: '2026-12-31',
      }),
    );
  });
  it('acumula varios estados a la vez, como los filtros de la línea de tiempo', () => {
    academicStub.getAgreements.calls.reset();
    component['alternarEstado']('VENCIDO');
    component['alternarEstado']('EN_PROCESO');

    expect(component['estadosSeleccionados']).toEqual(['VENCIDO', 'EN_PROCESO']);
    expect(academicStub.getAgreements).toHaveBeenCalledWith(
      jasmine.objectContaining({ estados: 'VENCIDO,EN_PROCESO' }),
    );
  });

  it('desmarca un estado sin tocar los demás', () => {
    academicStub.getAgreements.calls.reset();
    component['alternarEstado']('VENCIDO');
    component['alternarEstado']('EN_PROCESO');
    component['alternarEstado']('VENCIDO');

    expect(component['estadosSeleccionados']).toEqual(['EN_PROCESO']);
    expect(academicStub.getAgreements).toHaveBeenCalledWith(
      jasmine.objectContaining({ estados: 'EN_PROCESO' }),
    );
  });

  it('ordena por urgencia de forma predefinida', () => {
    expect(component['filtroOrden']).toBe('urgencia');
    expect(component['ordenes'][0].value).toBe('urgencia');
  });

  it('limpiar filtros devuelve también el orden a urgencia', () => {
    component['estadosSeleccionados'] = ['VENCIDO'];
    component['filtroOrden'] = 'estudiante';
    academicStub.getAgreements.calls.reset();

    component['limpiarFiltros']();

    expect(component['estadosSeleccionados']).toEqual([]);
    expect(component['filtroOrden']).toBe('urgencia');
    expect(academicStub.getAgreements).toHaveBeenCalledWith(
      jasmine.objectContaining({ orden: 'urgencia' }),
    );
  });
});

const userSignal = signal<AuthenticatedUser | null>({
  id: 1,
  email: 'coord@nexus.edu',
  first_name: 'Coord',
  last_name: 'Demo',
  role: 'PROGRAM_COORDINATOR',
  roles: ['PROGRAM_COORDINATOR'],
  permissions: ['academic.read.global'],
});

const acuerdo = (id: number, descripcion: string) => ({
  id,
  student: 4,
  student_nombre: 'Diego Fuentes',
  student_matricula: 'DOC250002',
  session: 12,
  semester: 3,
  semester_numero: 2,
  descripcion,
  responsable: 15,
  responsable_nombre: 'Diego Fuentes',
  fecha_limite: '2099-10-30',
  estado: 'PENDIENTE' as const,
  is_vencido: false,
});

const lote1 = {
  count: 15,
  next: 'http://testserver/api/v1/agreements/?limit=10&offset=10',
  previous: null,
  results: Array.from({ length: 10 }, (_, i) => acuerdo(i + 1, `Acuerdo ${i + 1}`)),
};
const lote2 = {
  count: 15,
  next: null,
  previous: 'http://testserver/api/v1/agreements/?limit=10&offset=0',
  results: Array.from({ length: 5 }, (_, i) => acuerdo(i + 11, `Acuerdo ${i + 11}`)),
};

describe('AgreementsListComponent — scroll infinito', () => {
  let fixture: ComponentFixture<AgreementsListComponent>;
  let component: AgreementsListComponent;

  const academicStub = {
    getAgreements: jasmine.createSpy('getAgreements').and.callFake((filters: { offset?: number }) =>
      of((filters.offset ?? 0) > 0 ? lote2 : lote1),
    ),
    getGlobalOverview: jasmine.createSpy('getGlobalOverview').and.returnValue(of({ count: 1, next: null, previous: null, results: [] })),
    getStudentSemesters: jasmine.createSpy('getStudentSemesters').and.returnValue(of([])),
    getAgreementAuditLog: jasmine.createSpy('getAgreementAuditLog').and.returnValue(of([])),
    updateAgreementStatus: jasmine.createSpy('updateAgreementStatus').and.returnValue(of({})),
  };

  const authStub = {
    user: userSignal,
    hasPermission: (p: string) => p === 'academic.read.global',
  };

  const studentStub = {
    getStudents: jasmine.createSpy('getStudents').and.returnValue(of({ count: 0, next: null, previous: null, results: [] })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgreementsListComponent],
      providers: [
        provideRouter([]),
        { provide: AcademicService, useValue: academicStub },
        { provide: AuthService, useValue: authStub },
        { provide: StudentService, useValue: studentStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgreementsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('la primera carga pide el primer lote por offset', () => {
    expect(academicStub.getAgreements).toHaveBeenCalledWith(
      jasmine.objectContaining({ limit: 10, offset: 0 }),
    );
    expect(component['agreements'].length).toBe(10);
    expect(component['haySiguiente']).toBeTrue();
  });

  it('el sentinel acumula el siguiente lote sin repetir filas', () => {
    academicStub.getAgreements.calls.reset();
    component['cargarMas']();

    expect(academicStub.getAgreements).toHaveBeenCalledWith(
      jasmine.objectContaining({ limit: 10, offset: 10 }),
    );
    expect(component['agreements'].length).toBe(15);
    expect(component['offset']).toBe(15);
    expect(component['haySiguiente']).toBeFalse();

    const ids = component['agreements'].map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no vuelve a pedir un lote si ya no hay siguiente o hay una carga en vuelo', () => {
    academicStub.getAgreements.calls.reset();
    component['haySiguiente'] = false;
    component['cargarMas']();
    expect(academicStub.getAgreements).not.toHaveBeenCalled();

    component['haySiguiente'] = true;
    component['cargandoMas'] = true;
    component['cargarMas']();
    expect(academicStub.getAgreements).not.toHaveBeenCalled();
  });

  it('aplicar filtros descarta lo acumulado y vuelve al primer lote', () => {
    component['cargarMas']();
    expect(component['agreements'].length).toBe(15);

    academicStub.getAgreements.calls.reset();
    component['aplicarFiltros']();

    expect(academicStub.getAgreements).toHaveBeenCalledWith(
      jasmine.objectContaining({ limit: 10, offset: 0 }),
    );
    expect(component['agreements'].length).toBe(10);
    expect(component['offset']).toBe(0);
  });

  it('anuncia el avance con el conteo de filas mostradas', () => {
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Mostrando 10 de 15');

    component['cargarMas']();
    fixture.detectChanges();
    const textoFinal = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(textoFinal).toContain('Mostrando 15 de 15');
    expect(textoFinal).toContain('Ya viste todos los acuerdos.');
  });

  it('renderiza el contenedor de filas y el sentinel mientras quede página', () => {
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    // Según el ancho del entorno: viewport virtualizado (escritorio) o tabla apilada (compacto).
    const filas = el.querySelector('cdk-virtual-scroll-viewport') ?? el.querySelector('.table-container table');
    expect(filas).not.toBeNull();
    expect(el.querySelector('.sentinel')).not.toBeNull();
    expect(el.querySelector('.paginator')).toBeNull();
  });
});

describe('AgreementsListComponent — escritorio (>1200px)', () => {
  let fixture: ComponentFixture<AgreementsListComponent>;

  const academicStub = {
    getAgreements: jasmine.createSpy('getAgreements').and.returnValue(of(lote1)),
    getGlobalOverview: jasmine.createSpy('getGlobalOverview').and.returnValue(of({ count: 1, next: null, previous: null, results: [] })),
    getStudentSemesters: jasmine.createSpy('getStudentSemesters').and.returnValue(of([])),
    getAgreementAuditLog: jasmine.createSpy('getAgreementAuditLog').and.returnValue(of([])),
    updateAgreementStatus: jasmine.createSpy('updateAgreementStatus').and.returnValue(of({})),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgreementsListComponent],
      providers: [
        provideRouter([]),
        { provide: AcademicService, useValue: academicStub },
        { provide: AuthService, useValue: { user: userSignal, hasPermission: (p: string) => p === 'academic.read.global' } },
        { provide: StudentService, useValue: { getStudents: () => of({ count: 0, next: null, previous: null, results: [] }) } },
        // Ancho forzado: así el escritorio se prueba incluso si el entorno corre angosto.
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false, breakpoints: {} }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgreementsListComponent);
    fixture.detectChanges();
  });

  it('virtualiza las filas con cdk-virtual-scroll-viewport', async () => {
    // El viewport mide su tamaño tras el primer ciclo: un segundo CD estabiliza el rango.
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('cdk-virtual-scroll-viewport')).not.toBeNull();
    expect(el.querySelectorAll('tbody tr').length).toBe(10);
    expect(el.querySelector('.sentinel')).not.toBeNull();
  });
});
