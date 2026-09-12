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
      fecha_limite: '2026-09-20',
      estado: 'EN_PROCESO',
      responsable_nombre: 'Laura Méndez',
      is_vencido: false,
    },
  ],
  thesis_progress: {
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
  thesis_progress: {
    porcentaje_avance: 0,
    observaciones: '',
    componentes_json: {},
    fecha_registro: null,
  },
  recent_academic_activity: [],
};

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
    const req = http.expectOne('http://localhost:8000/api/records/10/');
    req.flush(mockOverview);
  });

  it('carga y muestra los datos del estudiante (nombre, matrícula) y las 6 categorías', () => {
    fixture.detectChanges();
    const req = http.expectOne('http://localhost:8000/api/records/10/');
    expect(req.request.method).toBe('GET');
    req.flush(mockOverview);
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
    expect(text).toContain('2026-08-01');
    expect(text).toContain('2026-12-15');

    // 2. Advisors & Committee
    expect(text).toContain('Dr. Carlos Mendoza');
    expect(text).toContain('Dra. María Elena Ríos');
    expect(text).toContain('Dr. Roberto Gómez');

    // 3. Last Tutoring Session
    expect(text).toContain('2026-09-05');
    expect(text).toContain('PRESENCIAL');
    expect(text).toContain('Revisión del capítulo 2 de la tesis.');
    expect(text).toContain('Traer avances del estado del arte.');

    // 4. Open Agreements
    expect(text).toContain('Entregar primer borrador de la propuesta');
    expect(text).toContain('EN_PROCESO');

    // 5. Thesis Progress
    expect(text).toContain('45%');
    expect(text).toContain('Avance conforme al cronograma');
    expect(text).toContain('Capítulo 1');

    // 6. Recent Academic Activity
    expect(text).toContain('PUBLICACION');
    expect(text).toContain('Algoritmos distribuidos para optimización');
  });

  it('muestra mensaje de error cuando la llamada HTTP retorna 404', () => {
    fixture.detectChanges();
    const req = http.expectOne('http://localhost:8000/api/records/10/');
    req.flush({ detail: 'Not found.' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'El expediente solicitado no existe o no tiene permisos para consultarlo.'
    );
  });

  it('maneja estados vacíos (sin asesor, sin acuerdos, sin tutoría) sin fallar', () => {
    fixture.detectChanges();
    const req = http.expectOne('http://localhost:8000/api/records/10/');
    req.flush(mockEmptyOverview);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Sin semestre activo');
    expect(text).toContain('Comité pendiente de asignación');
    expect(text).toContain('Sin sesiones registradas');
    expect(text).toContain('Sin acuerdos pendientes');
    expect(text).toContain('Sin actividad académica registrada');
    expect(text).toContain('No hay semestres registrados');
    expect(text).toContain('INACTIVO');
  });

  it('handles 403 error for unauthorized user', () => {
    fixture.detectChanges();
    const req = http.expectOne('http://localhost:8000/api/records/10/');
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
    const req = http.expectOne('http://localhost:8000/api/records/10/');
    req.flush(mockOverview);
    fixture.detectChanges();

    // Toggle form
    const toggleBtn = fixture.nativeElement.querySelector('.btn-toggle-sem');
    expect(toggleBtn).toBeTruthy();
    toggleBtn.click();
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp['semForm'].patchValue({
      numero: 3,
      fecha_inicio: '2027-01-15',
      fecha_fin: '2027-06-30',
      is_active: false,
    });

    comp.registrarSemestre();

    const postReq = http.expectOne('http://localhost:8000/api/students/10/semesters/');
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
    const reloadReq = http.expectOne('http://localhost:8000/api/records/10/');
    reloadReq.flush(mockOverview);
    fixture.detectChanges();

    expect(comp['mostrarFormSemestre']).toBeFalse();
  });
});
