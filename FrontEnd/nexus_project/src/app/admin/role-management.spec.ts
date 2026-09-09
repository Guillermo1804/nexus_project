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
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RoleManagement);
    fixture.detectChanges();
    http.expectOne('http://localhost:8000/api/auth/users/').flush([{
      id: 1, email: 'student@example.com', first_name: 'Ana', last_name: 'Lopez', role: 'STUDENT',
      roles: ['STUDENT'], permissions: ['records.read.own'],
    }]);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads users and displays their role', () => {
    expect(fixture.nativeElement.textContent).toContain('student@example.com');
    expect(fixture.nativeElement.textContent).toContain('STUDENT');
  });

  it('updates the user row after assigning a role', () => {
    const component = fixture.componentInstance;
    component.assignRole({
      id: 1, email: 'student@example.com', first_name: 'Ana', last_name: 'Lopez', role: 'STUDENT',
      roles: ['STUDENT'], permissions: ['records.read.own'],
    }, 'TUTOR');
    http.expectOne('http://localhost:8000/api/auth/users/1/role/').flush({
      id: 1, email: 'student@example.com', first_name: 'Ana', last_name: 'Lopez', role: 'TUTOR',
      roles: ['TUTOR'], permissions: ['tutoring.create'],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('tutoring.create');
  });
});