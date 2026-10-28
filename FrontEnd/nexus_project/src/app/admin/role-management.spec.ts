import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoleManagement } from './role-management';

describe('RoleManagement', () => {
  let fixture: ComponentFixture<RoleManagement>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleManagement],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RoleManagement);
    fixture.detectChanges();
    http.expectOne('http://localhost:8000/api/v1/auth/users/?page=1').flush({ count: [{
      id: 1, email: 'student@example.com', first_name: 'Ana', last_name: 'Lopez', role: 'STUDENT',
      roles: ['STUDENT'], permissions: ['records.read.own'],
    }].length, next: null, previous: null, results: [{
      id: 1, email: 'student@example.com', first_name: 'Ana', last_name: 'Lopez', role: 'STUDENT',
      roles: ['STUDENT'], permissions: ['records.read.own'],
    }] });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads users and displays their role', () => {
    expect(fixture.nativeElement.textContent).toContain('student@example.com');
    expect(fixture.nativeElement.textContent).toContain('Estudiante');
  });

  it('updates the user row after assigning a role', () => {
    const component = fixture.componentInstance;
    component.assignRole({
      id: 1, email: 'student@example.com', first_name: 'Ana', last_name: 'Lopez', role: 'STUDENT',
      roles: ['STUDENT'], permissions: ['records.read.own'],
    }, 'TUTOR');
    http.expectOne('http://localhost:8000/api/v1/auth/users/1/role/').flush({
      id: 1, email: 'student@example.com', first_name: 'Ana', last_name: 'Lopez', role: 'TUTOR',
      roles: ['TUTOR'], permissions: ['tutoring.create'],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Asesor / Tutor');
  });

  it('loads the next page of users when requested', () => {
    const component = fixture.componentInstance;

    http.expectNone('http://localhost:8000/api/v1/auth/users/?page=2');
    (component as any).goToPage(2);
    http.expectOne('http://localhost:8000/api/v1/auth/users/?page=2').flush({
      count: 11,
      next: null,
      previous: 'http://localhost:8000/api/v1/auth/users/?page=1',
      results: [{
        id: 2, email: 'tutor@example.com', first_name: 'Luis', last_name: 'Perez', role: 'TUTOR',
        roles: ['TUTOR'], permissions: ['tutoring.create'],
      }],
    });
    fixture.detectChanges();

    expect((component as any).currentPage).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('tutor@example.com');
    expect(fixture.nativeElement.textContent).toContain('Página 2');
  });

  it('does not allow changing the protected administrator role', () => {
    const component = fixture.componentInstance;
    component.assignRole({
      id: 2, email: 'admin@nexus.com', first_name: 'Admin', last_name: 'Nexus', role: 'SYSTEM_ADMIN',
      roles: ['SYSTEM_ADMIN'], permissions: [],
    }, 'STUDENT');

    http.expectNone('http://localhost:8000/api/v1/auth/users/2/role/');
    expect(component).toBeTruthy();
  });

  it('keeps the confirmed role and shows an error when assigning fails', () => {
    const component = fixture.componentInstance;
    component.assignRole({
      id: 1, email: 'student@example.com', first_name: 'Ana', last_name: 'Lopez', role: 'STUDENT',
      roles: ['STUDENT'], permissions: ['records.read.own'],
    }, 'TUTOR');
    const request = http.expectOne('http://localhost:8000/api/v1/auth/users/1/role/');
    fixture.detectChanges();

    expect((component as any).updatingUserIds.has(1)).toBeTrue();
    request.flush({ detail: 'Error interno.' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('select').value).toBe('STUDENT');
    expect((component as any).error).toBe('No fue posible actualizar el rol.');
    expect(fixture.nativeElement.querySelector('select').disabled).toBeFalse();
  });
});