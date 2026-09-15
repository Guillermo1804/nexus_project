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
    getGlobalStudents: () => of([]),
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
