import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommitteeManagement } from './committee-management';

describe('CommitteeManagement', () => {
  let fixture: ComponentFixture<CommitteeManagement>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommitteeManagement],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CommitteeManagement);
    fixture.detectChanges();
    http.expectOne('http://localhost:8000/api/v1/committees/').flush({ count: [].length, next: null, previous: null, results: [] });
    http.expectOne('http://localhost:8000/api/v1/auth/users/').flush({ count: [{
      id: 2, email: 'tutor@example.com', first_name: 'Eva', last_name: 'Diaz', role: 'TUTOR', roles: ['TUTOR'], permissions: ['tutoring.create'],
    }].length, next: null, previous: null, results: [{
      id: 2, email: 'tutor@example.com', first_name: 'Eva', last_name: 'Diaz', role: 'TUTOR', roles: ['TUTOR'], permissions: ['tutoring.create'],
    }] });
    http.expectOne('http://localhost:8000/api/v1/admin/students/').flush({ count: [{
      id: 1, matricula: 'DOC-001', nombre_completo: 'Ana Lopez', programa_doctoral: 'Doctorado', cohorte: '2026', estatus_activo: true,
    }].length, next: null, previous: null, results: [{
      id: 1, matricula: 'DOC-001', nombre_completo: 'Ana Lopez', programa_doctoral: 'Doctorado', cohorte: '2026', estatus_activo: true,
    }] });
  });

  afterEach(() => http.verify());

  it('loads only assignable accounts and active students', () => {
    expect((fixture.componentInstance as any).users.length).toBe(1);
    expect((fixture.componentInstance as any).students[0].matricula).toBe('DOC-001');
    expect(fixture.nativeElement.textContent).toContain('Selecciona una cuenta');
  });

  it('requires both selectors before creating an assignment', () => {
    fixture.componentInstance.createAssignment();
    expect((fixture.componentInstance as any).error).toContain('Selecciona una cuenta');
    http.verify();
  });
});