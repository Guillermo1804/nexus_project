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

  it('combina filtros en el endpoint v1 paginado de acuerdos (HU-14)', () => {
    service.getAgreements({ page: 2, student: 10, estado: 'PENDIENTE', vencido: true }).subscribe();
    const req = httpMock.expectOne('http://localhost:8000/api/v1/agreements/?page=2&student=10&estado=PENDIENTE&vencido=true');
    expect(req.request.method).toBe('GET');
    req.flush({ count: 0, next: null, previous: null, results: [] });
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
});
