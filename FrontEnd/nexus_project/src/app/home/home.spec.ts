import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Home } from './home';
import { AuthService } from '../core/auth/auth.service';
import { AcademicService } from '../core/academic/academic.service';
import { StudentService } from '../core/students/student.service';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AuthenticatedUser } from '../core/auth/auth.models';

describe('Home Component', () => {
  let fixture: ComponentFixture<Home>;
  const userSignal = signal<AuthenticatedUser | null>(null);

  const authStub = {
    user: userSignal,
    logout: jasmine.createSpy('logout').and.returnValue(of(undefined)),
    hasPermission: () => false,
  };

  const academicStub = {
    getGlobalOverview: () => of({ count: 0, next: null, previous: null, results: [] }),
    getTutoringSessions: () => of({ count: 0, next: null, previous: null, results: [] }),
    getAgreements: () => of({ count: 0, next: null, previous: null, results: [] }),
  };

  const studentStub = {
    students: signal([]),
    loading: signal(false),
    error: signal(null),
    loadStudents: jasmine.createSpy('loadStudents'),
  };

  beforeEach(async () => {
    userSignal.set(null);

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authStub },
        { provide: AcademicService, useValue: academicStub },
        { provide: StudentService, useValue: studentStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
  });

  it('renders gendered greeting based on user preference', () => {
    userSignal.set({
      id: 1,
      email: 'maria@test.com',
      first_name: 'María',
      last_name: 'Pérez',
      role: 'PROGRAM_COORDINATOR',
      roles: ['PROGRAM_COORDINATOR'],
      permissions: [],
      grammatical_gender: 'FEMININE',
    });

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Bienvenida, María.');
    expect(compiled.textContent).toContain('Coordinadora del programa');
  });

  it('links a student to the Student profile id instead of the user id', () => {
    userSignal.set({
      id: 15,
      student_id: 4,
      email: 'diego@test.com',
      first_name: 'Diego',
      last_name: 'Fuentes',
      role: 'STUDENT',
      roles: ['STUDENT'],
      permissions: ['records.read.own'],
    });

    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a[href="/expediente/4"]') as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/expediente/15"]')).toBeNull();
  });

  it('explains when a student account has no linked academic record', () => {
    userSignal.set({
      id: 15,
      student_id: null,
      email: 'diego@test.com',
      first_name: 'Diego',
      last_name: 'Fuentes',
      role: 'STUDENT',
      roles: ['STUDENT'],
      permissions: ['records.read.own'],
    });

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('aún no tiene un expediente académico vinculado');
    expect(fixture.nativeElement.querySelector('a[href^="/expediente/"]')).toBeNull();
  });

  it('falls back to neutral greeting and role when unspecified', () => {
    userSignal.set({
      id: 2,
      email: 'alex@test.com',
      first_name: 'Alex',
      last_name: 'Díaz',
      role: 'PROGRAM_COORDINATOR',
      roles: ['PROGRAM_COORDINATOR'],
      permissions: [],
      grammatical_gender: 'UNSPECIFIED',
    });

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Te damos la bienvenida, Alex.');
    expect(compiled.textContent).toContain('Coordinación del programa');
  });
});
