import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { StudentOverviewComponent } from './student-overview';
import { StudentOverview } from '../core/academic/academic.models';
import { AuthService } from '../core/auth/auth.service';

const mockOverview: StudentOverview = {
  id: 10,
  matricula: 'DOC-2026-010',
  nombre_completo: 'Laura Méndez',
  programa_doctoral: 'Doctorado en Ciencias Computacionales',
  cohorte: '2026-A',
  estatus_activo: true,
  student: {
    id: 10,
    user_id: 30,
    matricula: 'DOC-2026-010',
    nombre_completo: 'Laura Méndez',
    programa_doctoral: 'Doctorado en Ciencias Computacionales',
    cohorte: '2026-A',
    fecha_ingreso: '2026-01-15',
    estatus_activo: true,
  },
  current_semester: {
    id: 2,
    numero: 2,
    fecha_inicio: '2026-08-01',
    fecha_fin: '2026-12-15',
    is_active: true,
  },
  semesters: [
    {
      id: 1,
      student: 10,
      numero: 1,
      fecha_inicio: '2026-01-15',
      fecha_fin: '2026-06-30',
      is_active: false,
    },
    {
      id: 2,
      student: 10,
      numero: 2,
      fecha_inicio: '2026-08-01',
      fecha_fin: '2026-12-15',
      is_active: true,
    },
  ],
  advisors: {
    advisor: {
      id: 20,
      nombre_completo: 'Dr. Carlos Mendoza',
      email: 'carlos@mendoza.edu',
      rol_comite: 'Asesor Principal',
    },
    coadvisor: {
      id: 21,
      nombre_completo: 'Dra. María Elena Ríos',
      email: 'maria@rios.edu',
      rol_comite: 'Coasesor',
    },
    members: [
      {
        id: 22,
        nombre_completo: 'Dr. Roberto Gómez',
        email: 'roberto@gomez.edu',
        rol_comite: 'Vocal',
      },
    ],
  },
  last_tutoring: {
    id: 5,
    fecha_sesion: '2026-09-05',
    modalidad: 'PRESENCIAL',
    resumen: 'Revisión del capítulo 2 de la tesis.',
    proxima_reunion_fecha: '2026-10-05',
    proxima_reunion_notas: 'Traer avances del estado del arte.',
  },
  open_agreements: [
    {
      id: 101,
      descripcion: 'Entregar primer borrador de la propuesta',
      fecha_limite: '2026-11-20',
      estado: 'EN_PROCESO',
      responsable: 30,
      responsable_nombre: 'Laura Méndez',
      is_vencido: false,
    },
  ],
  thesis_progress: {
    id: 201,
    porcentaje_avance: 45,
    observaciones: 'Avance conforme al cronograma',
    componentes_json: { 'Capítulo 1': 'Aprobado', 'Capítulo 2': 'En revisión' },
    fecha_registro: '2026-09-01',
  },
  recent_academic_activity: [
    {
      tipo: 'PUBLICACION',
      titulo: 'Algoritmos distribuidos para optimización',
      fecha: '2026-08-20',
      detalle: 'Artículo indexado en IEEE Transactions',
    },
  ],
};

const mockEmptyOverview: StudentOverview = {
  id: 10,
  matricula: 'DOC-2026-010',
  nombre_completo: 'Juan Pérez',
  programa_doctoral: 'Doctorado en Educación',
  cohorte: '2026-B',
  estatus_activo: false,
  student: {
    id: 10,
    user_id: null,
    matricula: 'DOC-2026-010',
    nombre_completo: 'Juan Pérez',
    programa_doctoral: 'Doctorado en Educación',
    cohorte: '2026-B',
    fecha_ingreso: '2026-01-15',
    estatus_activo: false,
  },
  current_semester: null,
  semesters: [],
  advisors: {
    advisor: null,
    coadvisor: null,
    members: [],
  },
  last_tutoring: null,
  open_agreements: [],
  thesis_progress: null,
  recent_academic_activity: [],
};

/** Flushes side HTTP from HU-09 observations + HU-11/12/13 agreements. */
const MOCK_SIDE_AGREEMENTS = mockOverview.open_agreements.map((a) => ({
  ...a,
  student: 10,
  semester: 2,
  session: null,
}));

function flushTutoringSideRequests(
  http: HttpTestingController,
  preferredSessionId: number | null = 5,
  agreements: unknown[] = MOCK_SIDE_AGREEMENTS,
): void {
  const sessionPayload =
    preferredSessionId == null
      ? { count: 0, next: null, previous: null, results: [] as unknown[] }
      : {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: preferredSessionId,
              student: 10,
              semester: 2,
              fecha_sesion: '2026-09-05',
              modalidad: 'PRESENCIAL',
              resumen: 'Revisión del capítulo 2 de la tesis.',
              created_by: 20,
            },
          ],
        };

  const sessionReqs = http.match((req) => req.urlWithParams.includes('/tutoring-sessions/?page=1'));
  sessionReqs.forEach((req) => {
    expect(req.request.method).toBe('GET');
    req.flush(sessionPayload);
  });

  http
    .match((req) => req.urlWithParams.includes('/monitoring/alerts/agreements/?student='))
    .forEach((req) => {
      expect(req.request.method).toBe('GET');
      req.flush({ total_alertas: 0, vencidos_count: 0, proximos_vencer_count: 0, alertas: [] });
    });

  http
    .match((req) => req.urlWithParams.includes('/api/v1/agreements/?student='))
    .forEach((req) => {
      expect(req.request.method).toBe('GET');
      req.flush({ count: agreements.length, next: null, previous: null, results: agreements });
    });

  if (preferredSessionId == null) return;

  http
    .match((req) => req.url.includes(`/tutoring-sessions/${preferredSessionId}/observations/`))
    .forEach((req) => {
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

  http
    .match((req) => req.url.includes(`/tutoring-sessions/${preferredSessionId}/agreements/`))
    .forEach((req) => {
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
}

describe('StudentOverviewComponent', () => {
  let component: StudentOverviewComponent;
  let fixture: ComponentFixture<StudentOverviewComponent>;
  let http: HttpTestingController;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentOverviewComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '10' }),
            },
          },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(StudentOverviewComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    http.verify();
  });

  it('se crea correctamente', () => {
    expect(component).toBeTruthy();
    fixture.detectChanges();
    const req = http.expectOne('http://localhost:8000/api/v1/students/10/overview/');
    req.flush(mockOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, 5);
  });

  it('carga y muestra los datos del estudiante (nombre, matrícula) y las 6 categorías', () => {
    fixture.detectChanges();
    const req = http.expectOne('http://localhost:8000/api/v1/students/10/overview/');
    expect(req.request.method).toBe('GET');
    req.flush(mockOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, 5);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    // Student Header
    expect(text).toContain('Laura Méndez');
    expect(text).toContain('DOC-2026-010');
    expect(text).toContain('Doctorado en Ciencias Computacionales');
    expect(text).toContain('2026-A');
    expect(text).toContain('ACTIVO');

    // 1. Current Semester
    expect(text).toContain('Semestre 2');
    expect(text).toContain('(Actual)');

    // 2. Advisors & Committee
    expect(text).toContain('Dr. Carlos Mendoza');
    expect(text).toContain('Dra. María Elena Ríos');
    expect(text).toContain('Dr. Roberto Gómez');

    // 3. Last Tutoring Session
    expect(text).toContain('2026-09-05');
    expect(text).toContain('PRESENCIAL');
    expect(text).toContain('Revisión del capítulo 2 de la tesis.');
    expect(text).toContain('September 5, 2026');

    // 4. Open Agreements
    expect(text).toContain('Entregar primer borrador de la propuesta');
    expect(text).toContain('EN PROCESO');

    // 5. Thesis Progress
    expect(text).toContain('45%');
    expect(text).toContain('Avance global');
    expect(text).toContain('Capítulo 1');
  });

  it('muestra mensaje de error cuando la llamada HTTP retorna 404', () => {
    fixture.detectChanges();
    const req = http.expectOne('http://localhost:8000/api/v1/students/10/overview/');
    req.flush({ detail: 'Not found.' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'El expediente solicitado no existe o no tiene permisos para consultarlo.'
    );
  });

  it('excluye tutorías futuras del selector de acuerdos', () => {
    component['overview'] = {
      ...mockOverview,
      semesters: [{
        ...mockOverview.semesters[0],
        tutoring_sessions: [
          { id: 1, fecha_sesion: '2026-10-05', modalidad: 'PRESENCIAL', resumen: 'Sesión realizada' },
          { id: 2, fecha_sesion: '2026-12-01', modalidad: 'VIRTUAL', resumen: 'Sesión futura' },
        ],
      }],
    };
    component['selectedSemesterId'] = 1;

    expect(component['semesterSessions'].map(session => session.id)).toEqual([1]);
  });

  it('maneja estados vacíos (sin asesor, sin acuerdos, sin tutoría) sin fallar', () => {
    fixture.detectChanges();
    const req = http.expectOne('http://localhost:8000/api/v1/students/10/overview/');
    req.flush(mockEmptyOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, null);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('No hay semestres registrados');
    expect(text).toContain('Sin comité asignado');
    expect(text).toContain('INACTIVO');
  });

  it('handles 403 error for unauthorized user', () => {
    fixture.detectChanges();
    const req = http.expectOne('http://localhost:8000/api/v1/students/10/overview/');
    req.flush({ detail: 'Forbidden.' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No cuenta con autorización para consultar este expediente.'
    );
  });

  it('allows registering a semester when user has semesters.manage permission', () => {
    authService.user.set({
      id: 99,
      email: 'coordinator@nexus.edu',
      first_name: 'Coord',
      last_name: 'Nexus',
      role: 'PROGRAM_COORDINATOR',
      roles: ['PROGRAM_COORDINATOR'],
      permissions: ['semesters.manage', 'students.create'],
    });

    fixture.detectChanges();
    const req = http.expectOne('http://localhost:8000/api/v1/students/10/overview/');
    req.flush(mockOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, 5);
    fixture.detectChanges();

    // Toggle form
    const toggleBtn = fixture.nativeElement.querySelector('.add-semester');
    expect(toggleBtn).toBeTruthy();
    toggleBtn.click();
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    const semesterForm = fixture.debugElement.query((element) => element.name === 'app-semester-form').componentInstance;
    semesterForm.form.patchValue({
      numero: 3,
      fecha_inicio: '2027-01-15',
      fecha_fin: '2027-06-30',
      is_active: false,
    });

    semesterForm.submit();

    const postReq = http.expectOne('http://localhost:8000/api/v1/students/10/semesters/');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      numero: 3,
      fecha_inicio: '2027-01-15',
      fecha_fin: '2027-06-30',
      is_active: false,
    });

    postReq.flush({
      id: 3,
      student: 10,
      numero: 3,
      fecha_inicio: '2027-01-15',
      fecha_fin: '2027-06-30',
      is_active: false,
    });

    // Expect reload
    const reloadReq = http.expectOne('http://localhost:8000/api/v1/students/10/overview/');
    reloadReq.flush(mockOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, 5);
    fixture.detectChanges();

    expect(comp['modal']).toBeNull();
  });

  it('rejects a semester whose end date is before its start date accessibly', () => {
    authService.user.set({
      id: 99, email: 'coordinator@nexus.edu', first_name: 'Coord', last_name: 'Nexus',
      role: 'PROGRAM_COORDINATOR', roles: ['PROGRAM_COORDINATOR'], permissions: ['semesters.manage'],
    });
    fixture.detectChanges();
    http.expectOne('http://localhost:8000/api/v1/students/10/overview/').flush(mockOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, 5);
    fixture.componentInstance['openModal']('semestre');

    fixture.detectChanges();
    const semesterForm = fixture.debugElement.query((element) => element.name === 'app-semester-form').componentInstance;
    semesterForm.form.patchValue({ fecha_inicio: '2027-06-30', fecha_fin: '2027-01-15' });
    semesterForm.submit();
    fixture.detectChanges();

    expect(semesterForm.form.hasError('dateRange')).toBeTrue();
    const error = fixture.nativeElement.querySelector('#semester-date-error');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(http.match((request) => request.method === 'POST').length).toBe(0);
  });

  it('no cancela los eventos del ratón dentro de los modales para que los campos reciban foco y el envío funcione', () => {
    authService.user.set({
      id: 99, email: 'coordinator@nexus.edu', first_name: 'Coord', last_name: 'Nexus',
      role: 'PROGRAM_COORDINATOR', roles: ['PROGRAM_COORDINATOR'],
      permissions: ['semesters.manage', 'tutoring.create', 'academic.read.global', 'students.create'],
    });
    fixture.detectChanges();
    http.expectOne('http://localhost:8000/api/v1/students/10/overview/').flush(mockOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, 5);

    const panelClass: Record<string, string> = {
      evidencia: 'evidence-modal',
      tutoria: 'tutoring-modal',
      avance: 'progress-modal',
    };

    for (const modal of ['evidencia', 'tutoria', 'avance'] as const) {
      fixture.componentInstance['openModal'](modal);
      fixture.detectChanges();

      const panel = fixture.nativeElement.querySelector(`.${panelClass[modal]}`);
      expect(panel).withContext(`modal ${modal}`).toBeTruthy();

      // A binding that evaluates to false makes Angular call preventDefault(), which
      // would leave every field unfocusable and stop the submit button from submitting.
      for (const type of ['mousedown', 'click'] as const) {
        const field = panel.querySelector('input, textarea, select');
        const event = new MouseEvent(type, { bubbles: true, cancelable: true });
        field.dispatchEvent(event);
        expect(event.defaultPrevented).withContext(`${type} en ${modal}`).toBeFalse();
      }

      fixture.componentInstance['cerrarModal']();
      fixture.detectChanges();
    }
  });

  it('sigue cerrando el modal al pulsar el fondo, no los controles de dentro', () => {
    authService.user.set({
      id: 99, email: 'coordinator@nexus.edu', first_name: 'Coord', last_name: 'Nexus',
      role: 'PROGRAM_COORDINATOR', roles: ['PROGRAM_COORDINATOR'],
      permissions: ['semesters.manage', 'tutoring.create', 'academic.read.global', 'students.create'],
    });
    fixture.detectChanges();
    http.expectOne('http://localhost:8000/api/v1/students/10/overview/').flush(mockOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, 5);

    fixture.componentInstance['openModal']('semestre');
    fixture.detectChanges();
    const backdrop = fixture.nativeElement.querySelector('.modal-backdrop');
    expect(backdrop).withContext('fondo del modal').toBeTruthy();

    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: false }));
    expect(fixture.componentInstance['modal']).withContext('clic en el fondo').toBeNull();

    fixture.componentInstance['openModal']('semestre');
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('.modal-backdrop .embedded-form')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fixture.componentInstance['modal']).withContext('clic dentro del panel').toBe('semestre');
  });
});

describe('StudentOverviewComponent, refresco automático tras guardar', () => {
  let component: StudentOverviewComponent;
  let fixture: ComponentFixture<StudentOverviewComponent>;
  let http: HttpTestingController;
  let authService: AuthService;

  const MOCK_TIMELINE = {
    student: { id: 10, matricula: 'DOC-2026-010', nombre_completo: 'Laura Méndez' },
    semestres: [{
      id: 2,
      numero: 2,
      activo: true,
      eventos: [{
        id: 'E-1',
        tipo: 'EVIDENCIA',
        fecha: '2026-09-10',
        titulo: 'Certificado de asistencia',
        descripcion: '',
        archivo_url: 'https://example.org/evidence.pdf',
        metadata: {},
        actividad: { tipo: 'TUTORIA', id: 5, etiqueta: 'Tutoría', titulo: 'Sesión de tutoría', fecha: '2026-09-05' },
      }],
    }],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentOverviewComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '10' }) } },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(StudentOverviewComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => http.verify());

  /** Carga inicial y deja el componente con datos en pantalla. */
  function cargarInicial(): void {
    fixture.detectChanges();
    http.expectOne('http://localhost:8000/api/v1/students/10/overview/').flush(mockOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, 5);
    fixture.detectChanges();
  }

  it('recarga el expediente al guardar una evidencia, sin pedir recargar la página', () => {
    cargarInicial();

    component['evidenciaGuardada']();

    // La siguiente petición es el refresco: si no se hiciera, no habría nada que responder.
    const refresh = http.expectOne('http://localhost:8000/api/v1/students/10/overview/');
    expect(refresh.request.method).toBe('GET');
    refresh.flush(mockOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, 5);
    fixture.detectChanges();
    http.verify();
  });

  it('el refresco no parpadea la pantalla: no muestra el estado de carga', () => {
    cargarInicial();
    expect(fixture.nativeElement.querySelector('.state-container')).toBeNull();

    component['evidenciaGuardada']();
    fixture.detectChanges();

    expect(component['cargando']).withContext('refresco silencioso').toBeFalse();
    expect(fixture.nativeElement.querySelector('.state-container')).toBeNull();

    http.expectOne('http://localhost:8000/api/v1/students/10/overview/').flush(mockOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, 5);
  });

  it('vuelve a pedir la línea de tiempo aunque ya se haya cargado', () => {
    authService.user.set({
      id: 99, email: 'coordinator@nexus.edu', first_name: 'Coord', last_name: 'Nexus',
      role: 'PROGRAM_COORDINATOR', roles: ['PROGRAM_COORDINATOR'], permissions: ['semesters.manage'],
    });
    cargarInicial();

    component['selectView']('timeline');
    fixture.detectChanges();
    http.expectOne((r) => r.url.includes('/monitoring/timeline/')).flush(MOCK_TIMELINE);
    fixture.detectChanges();
    expect(component['timelineLoaded']).toBeTrue();

    // Un avance de tesis nuevo tiene que verse sin pasar por «Actualizar».
    component['avanceGuardado']();
    fixture.detectChanges();

    http.expectOne('http://localhost:8000/api/v1/students/10/overview/').flush(mockOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, 5);
    fixture.detectChanges();
    http.expectOne((r) => r.url.includes('/monitoring/timeline/')).flush(MOCK_TIMELINE);
    fixture.detectChanges();
    http.verify();
  });

  it('muestra la pestaña de evidencias y filtra la tabla desde la trayectoria', () => {
    cargarInicial();

    component['selectView']('evidencias');
    fixture.detectChanges();
    http.expectOne((r) => r.url.includes('/monitoring/timeline/')).flush(MOCK_TIMELINE);
    fixture.detectChanges();

    const tab = [...fixture.nativeElement.querySelectorAll('.overview-tabs button')]
      .find((button: Element) => button.textContent?.trim() === 'Evidencias') as HTMLButtonElement;
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.evidence-table tbody tr').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.evidence-table').textContent).toContain('Sesión de tutoría');
    expect(fixture.nativeElement.querySelector('.evidence-table a').textContent).toContain('Abrir');
  });

  it('descarta la línea de tiempo vieja si no está a la vista', () => {
    cargarInicial();
    expect(component['timelineLoaded']).toBeFalse();

    component['tutoriaGuardada']();
    fixture.detectChanges();

    http.expectOne('http://localhost:8000/api/v1/students/10/overview/').flush(mockOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, 5);
    fixture.detectChanges();
    // No se habrá pedido la trayectoria porque sigue en la vista de resumen.
    http.verify();
  });
});

describe('StudentOverviewComponent, estado vencido derivado y aviso flotante', () => {
  let component: StudentOverviewComponent;
  let fixture: ComponentFixture<StudentOverviewComponent>;
  let http: HttpTestingController;
  let authService: AuthService;

  const OVERVIEW_URL = 'http://localhost:8000/api/v1/students/10/overview/';
  const ACUERDO_VENCIDO = {
    id: 201,
    descripcion: 'Entregar el capítulo de metodología',
    fecha_limite: '2026-01-15',
    estado: 'PENDIENTE',
    responsable: 30,
    responsable_nombre: 'Laura Méndez',
    is_vencido: true,
    student: 10,
    semester: 2,
    session: null,
  };
  const ACUERDO_ACTIVO = {
    id: 202,
    descripcion: 'Preparar la defensa anual del proyecto',
    fecha_limite: '2026-11-20',
    estado: 'EN_PROCESO',
    responsable: 30,
    responsable_nombre: 'Laura Méndez',
    is_vencido: false,
    student: 10,
    semester: 2,
    session: null,
  };
  const MOCK_TIMELINE = {
    student: { id: 10, matricula: 'DOC-2026-010', nombre_completo: 'Laura Méndez' },
    semestres: [{
      id: 2,
      numero: 2,
      activo: true,
      eventos: [{
        id: 'E-9',
        tipo: 'EVIDENCIA',
        fecha: '2026-10-01',
        titulo: 'Minuta de la sesión',
        descripcion: '',
        archivo_url: 'https://example.org/minuta.pdf',
        metadata: {},
        actividad: { tipo: 'TUTORIA', id: 5, etiqueta: 'Tutoría', titulo: 'Sesión de tutoría', fecha: '2026-09-05' },
      }],
    }],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentOverviewComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '10' }) } },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(StudentOverviewComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => http.verify());

  /** Carga inicial con una lista de acuerdos dada en lugar del mock por defecto. */
  function cargarCon(acuerdos: unknown[]): void {
    fixture.detectChanges();
    http.expectOne(OVERVIEW_URL).flush(mockOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, 5, acuerdos);
    fixture.detectChanges();
  }

  it('el tab de evidencias comparte el tratamiento visual de las otras pestañas', async () => {
    cargarCon([ACUERDO_ACTIVO]);

    const tabs: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.overview-tabs button'));
    expect(tabs.length).withContext('tres pestañas').toBe(3);
    const base = getComputedStyle(tabs[0]);
    const evidencias = getComputedStyle(tabs[2]);
    expect(evidencias.padding).withContext('mismo padding').toBe(base.padding);
    expect(evidencias.fontWeight).withContext('mismo peso tipográfico').toBe(base.fontWeight);
    expect(evidencias.borderBottomWidth).withContext('misma línea inferior').toBe(base.borderBottomWidth);

    // Color de la línea inferior de una pestaña seleccionada (el estilo activo de referencia).
    const colorActivo = getComputedStyle(tabs[0]).borderBottomColor;

    tabs[2].click();
    fixture.detectChanges();
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    // La transición de color dura 120 ms: se deja terminar antes de leer el estilo computado.
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(getComputedStyle(tabs[2]).borderBottomColor).withContext('mismo estilo activo').toBe(colorActivo);

    http.expectOne((r) => r.url.includes('/monitoring/timeline/')).flush(MOCK_TIMELINE);
    fixture.detectChanges();
  });

  it('la vista de evidencias recupera sus estilos de tabla (eliminados por error en 1a8c1e2)', () => {
    cargarCon([ACUERDO_ACTIVO]);

    component['selectView']('evidencias');
    fixture.detectChanges();
    http.expectOne((r) => r.url.includes('/monitoring/timeline/')).flush(MOCK_TIMELINE);
    fixture.detectChanges();

    const th = fixture.nativeElement.querySelector('.evidence-table th');
    expect(th).toBeTruthy();
    expect(getComputedStyle(th).textTransform).toBe('uppercase');
    expect(getComputedStyle(th).borderBottomWidth).toBe('1px');
    const caption = fixture.nativeElement.querySelector('.evidence-table caption');
    expect(getComputedStyle(caption).position).withContext('leyenda sr-only').toBe('absolute');
  });

  it('el estado derivado «vencido» se recalcula en el cliente aunque la bandera llegue desactualizada', () => {
    cargarCon([{ ...ACUERDO_VENCIDO, is_vencido: false }]);

    expect(fixture.nativeElement.textContent).toContain('VENCIDO');
    expect(fixture.nativeElement.textContent).not.toContain('PENDIENTE');
    expect(component['overdueCount']).toBe(1);
    expect(fixture.nativeElement.querySelector('.overdue-toast')).toBeTruthy();
  });

  it('el aviso de compromisos vencidos es flotante y descartable sin desplazar el contenido', () => {
    cargarCon([ACUERDO_VENCIDO]);

    const aviso = fixture.nativeElement.querySelector('.overdue-toast');
    expect(aviso).withContext('aviso flotante visible').toBeTruthy();
    expect(getComputedStyle(aviso).position).toBe('fixed');
    expect(aviso.getAttribute('role')).toBe('alert');
    // Ya no existe la tarjeta incrustada del aside (tercer <article> eliminado).
    expect(fixture.nativeElement.querySelector('.overdue-card')).toBeNull();

    jasmine.clock().install();
    (aviso.querySelector('.toast-close') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.overdue-toast').classList.contains('cerrando'))
      .withContext('fase de salida animada').toBeTrue();
    jasmine.clock().tick(121);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.overdue-toast')).withContext('descartado').toBeNull();
    jasmine.clock().uninstall();

    // No reaparece en un refresco silencioso mientras no haya vencidos nuevos.
    component['evidenciaGuardada']();
    http.expectOne(OVERVIEW_URL).flush(mockOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, 5, [ACUERDO_VENCIDO]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.overdue-toast')).toBeNull();
  });

  it('el modal de estado muestra el derivado «vencido» y no ofrece una transición cerrada', () => {
    cargarCon([ACUERDO_VENCIDO]);

    component['abrirEstado'](component['agreements'][0]);
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.status-modal');
    expect(modal).toBeTruthy();
    expect(modal.querySelector('.transition').textContent).toContain('VENCIDO');
    expect(modal.querySelector('.transition').textContent).not.toContain('EN PROCESO');
    expect(modal.querySelector('.transition').textContent).not.toContain('→');
    expect(modal.textContent).toContain('Los acuerdos vencidos están cerrados y no permiten cambios.');
    expect((modal.querySelector('.btn-primary') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('al actualizar el estado, el resumen refleja de inmediato el estado recalculado por el servidor', () => {
    authService.user.set({
      id: 30, email: 'laura@nexus.edu', first_name: 'Laura', last_name: 'Méndez',
      role: 'STUDENT', roles: ['STUDENT'], permissions: [],
    });
    cargarCon([ACUERDO_ACTIVO]);

    component['abrirEstado'](component['agreements'][0]);
    fixture.detectChanges();
    const guardar = fixture.nativeElement.querySelector('.status-modal .btn-primary') as HTMLButtonElement;
    expect(guardar.disabled).toBeFalse();
    guardar.click();

    const patch = http.expectOne('http://localhost:8000/api/v1/agreements/202/status/');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ estado: 'CONCLUIDO', comentario: '' });
    patch.flush({ ...ACUERDO_ACTIVO, estado: 'CONCLUIDO', is_vencido: false });

    // Antes incluso de que llegue el refresco, la fila ya muestra el estado nuevo.
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('CONCLUIDO');

    const refresh = http.expectOne(OVERVIEW_URL);
    refresh.flush(mockOverview);
    fixture.detectChanges();
    flushTutoringSideRequests(http, 5, [{ ...ACUERDO_ACTIVO, estado: 'CONCLUIDO' }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('CONCLUIDO');
  });

  it('una respuesta vieja de acuerdos no pisa el estado recién refrescado', () => {
    authService.user.set({
      id: 30, email: 'laura@nexus.edu', first_name: 'Laura', last_name: 'Méndez',
      role: 'STUDENT', roles: ['STUDENT'], permissions: [],
    });
    cargarCon([ACUERDO_ACTIVO]);

    component['evidenciaGuardada']();
    component['evidenciaGuardada']();

    http.match((r) => r.url === OVERVIEW_URL).forEach((r) => r.flush(mockOverview));
    fixture.detectChanges();

    const acuerdosReqs = http.match((r) => r.urlWithParams.includes('/api/v1/agreements/?student='));
    expect(acuerdosReqs.length).withContext('dos recargas solapadas').toBe(2);
    const fresco = { ...ACUERDO_ACTIVO, estado: 'CONCLUIDO' };
    acuerdosReqs[1].flush({ count: 1, next: null, previous: null, results: [fresco] });
    acuerdosReqs[0].flush({ count: 1, next: null, previous: null, results: [ACUERDO_ACTIVO] });
    fixture.detectChanges();

    expect(component['agreements'][0].estado).withContext('la respuesta vieja se descarta').toBe('CONCLUIDO');

    http
      .match((r) => r.urlWithParams.includes('/monitoring/alerts/agreements/'))
      .forEach((r) => r.flush({ total_alertas: 0, vencidos_count: 0, proximos_vencer_count: 0, alertas: [] }));
  });
});
