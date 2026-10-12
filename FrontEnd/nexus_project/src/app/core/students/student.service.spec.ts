import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { StudentService } from './student.service';
import { StudentRecord } from '../academic/academic.models';

describe('StudentService (Angular Signals)', () => {
  let service: StudentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StudentService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(StudentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe inicializarse con señales reactivas vacías', () => {
    expect(service.students()).toEqual([]);
    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeNull();
  });

  it('debe cargar estudiantes mediante la señal students() al llamar loadStudents()', () => {
    const mockStudents: StudentRecord[] = [
      {
        id: 1,
        matricula: 'DOC-2026-001',
        nombre_completo: 'Carlos Navarro',
        programa_doctoral: 'Doctorado en Ciencias',
        cohorte: '2026-A',
        estatus_activo: true,
      },
    ];

    service.loadStudents();
    expect(service.loading()).toBeTrue();

    const req = httpMock.expectOne((r) => r.url.endsWith('/v1/students/?page=1'));
    expect(req.request.method).toBe('GET');
    req.flush({ count: mockStudents.length, next: null, previous: null, results: mockStudents });

    expect(service.loading()).toBeFalse();
    expect(service.students()).toEqual(mockStudents);
    expect(service.students().length).toBe(1);
    expect(service.error()).toBeNull();
  });
});
