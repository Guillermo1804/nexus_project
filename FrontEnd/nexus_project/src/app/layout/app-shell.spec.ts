import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { AuthenticatedUser, UserRole } from '../core/auth/auth.models';
import { AuthService } from '../core/auth/auth.service';
import { AppShell } from './app-shell';

const ALERTS = { total_alertas: 3, criticos: 1, advertencias: 2, acuerdos: [] };

function user(role: UserRole, permissions: string[] = []): AuthenticatedUser {
  return {
    id: 1,
    email: 'persona@nexus.edu',
    first_name: 'Persona',
    last_name: 'Prueba',
    role,
    roles: [role],
    permissions,
  } as AuthenticatedUser;
}

describe('AppShell (menú lateral)', () => {
  let fixture: ComponentFixture<AppShell>;
  let alertSpy: jasmine.Spy;

  const configure = async (current: AuthenticatedUser): Promise<void> => {
    alertSpy = jasmine.createSpy('getAgreementAlerts').and.returnValue(of(ALERTS));
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: signal(current), isAuthenticated: () => true, hasPermission: () => false } },
        { provide: AcademicService, useValue: { getAgreementAlerts: alertSpy } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
  };

  const links = (): string[] =>
    [...fixture.nativeElement.querySelectorAll('.nav-list a')].map((a: Element) =>
      (a.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );

  afterEach(() => TestBed.resetTestingModule());

  it('oculta Acuerdos a quien no puede entrar a esa sección', async () => {
    await configure(user('SYSTEM_ADMIN', ['users.role.assign']));

    expect(links()).toEqual(['Inicio', 'Roles', 'Usuarios', 'Auditoría']);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  const AGREEMENT_ROLES: [UserRole, string[]][] = [
    ['STUDENT', ['records.read.own']],
    ['TUTOR', ['records.read.assigned', 'tutoring.create']],
    ['COMMITTEE_MEMBER', ['records.read.assigned', 'tutoring.create']],
    ['PROGRAM_COORDINATOR', ['academic.read.global', 'tutoring.create', 'students.create']],
  ];

  for (const [role, permissions] of AGREEMENT_ROLES) {
    it(`muestra Acuerdos a ${role}`, async () => {
      await configure(user(role, permissions));

      expect(links().some((l) => l.startsWith('Acuerdos'))).withContext(role).toBeTrue();
      expect(alertSpy).withContext(role).toHaveBeenCalled();
    });
  }
});