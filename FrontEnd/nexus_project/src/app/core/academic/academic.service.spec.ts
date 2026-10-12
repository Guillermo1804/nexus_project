import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AcademicService } from './academic.service';
import { Semester, CreateSemesterData } from './academic.models';

describe('AcademicService - Semesters (HU-05)', () => {
  let service: AcademicService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AcademicService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AcademicService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe consultar los semestres de un estudiante', () => {
    const mockSemesters: Semester[] = [
      {
        id: 1,
        student: 10,
        numero: 1,
        fecha_inicio: '2025-01-15',
        fecha_fin: '2025-06-30',
        is_active: true,
      },
    ];

    service.getStudentSemesters(10).subscribe((semesters) => {
      expect(semesters.length).toBe(1);
      expect(semesters[0].numero).toBe(1);
      expect(semesters[0].is_active).toBeTrue();
    });

    const req = httpMock.expectOne('http://localhost:8000/api/v1/students/10/semesters/');
    expect(req.request.method).toBe('GET');
    req.flush(mockSemesters);
  });

  it('usa el endpoint v1 real para crear tutorías (HU-07)', () => {
    const data = { student: 10, semester: 2, fecha_sesion: '2026-02-01', modalidad: 'VIRTUAL' as const, resumen: 'Avance' };
    service.createTutoringSession(data).subscribe();
    const req = httpMock.expectOne('http://localhost:8000/api/v1/tutoring-sessions/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(data);
    req.flush({ id: 1, ...data });
  });

  it('actualiza la próxima reunión mediante PATCH (HU-10)', () => {
    const data = {
      proxima_reunion_fecha: '2026-10-20',
      proxima_reunion_notas: 'Preparar avances del marco teórico.',
    };
    service.updateNextMeeting(12, data).subscribe();
    const req = httpMock.expectOne('http://localhost:8000/api/v1/tutoring-sessions/12/');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(data);
    req.flush({ id: 12, ...data });
  });

  it('combina filtros en el endpoint v1 paginado de acuerdos (HU-14)', () => {
    service.getAgreements({
      page: 2,
      student: 10,
      semester: 3,
      estado: 'PENDIENTE',
      responsable: 7,
      vencido: true,
      fecha_desde: '2026-01-01',
      fecha_hasta: '2026-12-31',
    }).subscribe();
    const req = httpMock.expectOne(
      'http://localhost:8000/api/v1/agreements/?page=2&student=10&semester=3&estado=PENDIENTE&responsable=7&vencido=true&fecha_desde=2026-01-01&fecha_hasta=2026-12-31',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('lista y crea observaciones de tutoría (HU-09)', () => {
    service.getSessionObservations(12).subscribe((items) => {
      expect(items.length).toBe(1);
      expect(items[0].autor_nombre).toBe('Dr. Roberto');
    });
    const listReq = httpMock.expectOne('http://localhost:8000/api/v1/tutoring-sessions/12/observations/');
    expect(listReq.request.method).toBe('GET');
    listReq.flush([
      {
        id: 1,
        session: 12,
        autor: 2,
        autor_nombre: 'Dr. Roberto',
        tema_revisado: 'Metodología',
        observaciones_detalladas: 'Ampliar el marco teórico con fuentes recientes.',
        created_at: '2026-09-14T11:30:00Z',
      },
    ]);

    const payload = {
      tema_revisado: 'Estado del arte',
      observaciones_detalladas: 'Incluir literatura 2024-2026.',
    };
    service.createSessionObservation(12, payload).subscribe((created) => {
      expect(created.id).toBe(2);
    });
    const createReq = httpMock.expectOne('http://localhost:8000/api/v1/tutoring-sessions/12/observations/');
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual(payload);
    createReq.flush({ id: 2, session: 12, autor: 2, autor_nombre: 'Dr. Roberto', ...payload, created_at: '2026-09-15T12:00:00Z' });
  });

  it('consulta la bitácora de un acuerdo (HU-14)', () => {
    service.getAgreementAuditLog(85).subscribe((entries) => {
      expect(entries.length).toBe(1);
    });
    const req = httpMock.expectOne('http://localhost:8000/api/v1/agreements/85/audit-log/');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, user: 2, estado_anterior: 'PENDIENTE', estado_nuevo: 'EN_PROCESO', comentario: '', fecha_cambio: '2026-09-01T10:00:00Z' }]);
  });

  it('lista tutorías paginadas (HU-11)', () => {
    service.getTutoringSessions(1).subscribe((res) => {
      expect(res.results.length).toBe(1);
      expect(res.results[0].id).toBe(5);
    });
    const req = httpMock.expectOne('http://localhost:8000/api/v1/tutoring-sessions/?page=1');
    expect(req.request.method).toBe('GET');
    req.flush({
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 5, student: 10, semester: 2, fecha_sesion: '2026-09-05', modalidad: 'PRESENCIAL', resumen: 'Avance', created_by: 20 }],
    });
  });

  it('consulta y crea acuerdos de una sesión (HU-11)', () => {
    service.getSessionAgreements(5).subscribe((list) => {
      expect(list.length).toBe(0);
    });
    const getReq = httpMock.expectOne('http://localhost:8000/api/v1/tutoring-sessions/5/agreements/');
    expect(getReq.request.method).toBe('GET');
    getReq.flush([]);

    const payload = {
      descripcion: 'Entregar borrador del capítulo 1',
      responsable: 20,
      fecha_limite: '2026-09-30',
    };
    service.createSessionAgreement(5, payload).subscribe((agr) => {
      expect(agr.id).toBe(101);
      expect(agr.descripcion).toBe(payload.descripcion);
    });
    const postReq = httpMock.expectOne('http://localhost:8000/api/v1/tutoring-sessions/5/agreements/');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual(payload);
    postReq.flush({
      id: 101,
      descripcion: payload.descripcion,
      fecha_limite: payload.fecha_limite,
      estado: 'PENDIENTE',
      responsable_nombre: 'Asesor',
      is_vencido: false,
    });
  });

  it('actualiza el estado de un acuerdo (HU-13)', () => {
    service.updateAgreementStatus(101, 'EN_PROCESO', 'Inicio de avance').subscribe((agr) => {
      expect(agr.estado).toBe('EN_PROCESO');
    });
    const req = httpMock.expectOne('http://localhost:8000/api/v1/agreements/101/status/');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 'EN_PROCESO', comentario: 'Inicio de avance' });
    req.flush({
      id: 101,
      descripcion: 'Entregar borrador',
      fecha_limite: '2026-09-30',
      estado: 'EN_PROCESO',
      responsable: 20,
      responsable_nombre: 'Asesor',
      is_vencido: false,
    });
  });

  it('debe registrar un nuevo semestre (1 al 6)', () => {
    const newSem: CreateSemesterData = {
      numero: 2,
      fecha_inicio: '2025-08-01',
      fecha_fin: '2025-12-15',
      is_active: false,
    };
    const createdSem: Semester = {
      id: 2,
      student: 10,
      ...newSem,
      is_active: false,
    };

    service.createSemester(10, newSem).subscribe((res) => {
      expect(res.id).toBe(2);
      expect(res.numero).toBe(2);
    });

    const req = httpMock.expectOne('http://localhost:8000/api/v1/students/10/semesters/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newSem);
    req.flush(createdSem);
  });

  it('consulta las alertas de acuerdos de HU-25', () => {
    service.getAgreementAlerts(10).subscribe((response) => {
      expect(response.total_alertas).toBe(1);
      expect(response.alertas[0].nivel).toBe('CRITICO');
    });

    const req = httpMock.expectOne('http://localhost:8000/api/v1/monitoring/alerts/agreements/?student=10');
    expect(req.request.method).toBe('GET');
    req.flush({
      total_alertas: 1,
      vencidos_count: 1,
      proximos_vencer_count: 0,
      alertas: [{
        agreement_id: 1,
        student_id: 10,
        student_nombre: 'Ana Pérez',
        descripcion: 'Entregar capítulo',
        responsable_nombre: 'Ana Pérez',
        fecha_limite: '2026-09-20',
        nivel: 'CRITICO',
        dias_retraso: 3,
        mensaje: 'Acuerdo vencido hace 3 días.',
      }],
    });
  });
});
