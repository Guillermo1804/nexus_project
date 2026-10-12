import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { AuthenticatedUser, UserRole } from '../core/auth/auth.models';
import { AuthService } from '../core/auth/auth.service';
import { AppShell } from './app-shell';

const ALERTS = { total_alertas: 3, criticos: 1, advertencias: 2, acuerdos: [] };

@Component({ selector: 'spec-empty', template: '' })
class SpecEmpty {}

function user(role: UserRole, permissions: string[] = [], extra: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    email: 'persona@nexus.edu',
    first_name: 'Persona',
    last_name: 'Prueba',
    role,
    roles: [role],
    permissions,
    ...extra,
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
        provideRouter([{ path: 'prueba', component: SpecEmpty }]),
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

  const menuButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('.menu-toggle');

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

  describe('acceso al expediente propio', () => {
    it('muestra «Mi expediente» al estudiante con expediente vinculado y apunta a su id', async () => {
      await configure(user('STUDENT', ['records.read.own'], { student_id: 7 }));

      const link = fixture.nativeElement.querySelector('a[aria-label="Mi expediente académico"]') as HTMLAnchorElement;
      expect(link).withContext('el enlace debe existir').toBeTruthy();
      expect(link.getAttribute('href')).toBe('/expediente/7');
    });

    it('oculta «Mi expediente» cuando el estudiante no tiene expediente vinculado', async () => {
      await configure(user('STUDENT', ['records.read.own']));

      expect(fixture.nativeElement.querySelector('a[aria-label="Mi expediente académico"]')).toBeNull();
    });

    for (const [role, permissions] of AGREEMENT_ROLES.filter(([r]) => r !== 'STUDENT')) {
      it(`no muestra «Mi expediente» a ${role}: su entrada a la vista es por estudiante consultado`, async () => {
        await configure(user(role, permissions));

        expect(fixture.nativeElement.querySelector('a[aria-label="Mi expediente académico"]')).withContext(role).toBeNull();
      });
    }
  });

  describe('menú de hamburguesa', () => {
    it('abre y cierra el menú con el botón, reflejando el estado en aria-expanded', async () => {
      await configure(user('STUDENT', ['records.read.own']));
      const button = menuButton();

      expect(button.getAttribute('aria-expanded')).toBe('false');
      button.click();
      fixture.detectChanges();
      expect(button.getAttribute('aria-expanded')).toBe('true');

      button.click();
      fixture.detectChanges();
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('cierra el menú al navegar a otra vista', async () => {
      await configure(user('STUDENT', ['records.read.own']));
      const button = menuButton();
      button.click();
      fixture.detectChanges();
      expect(button.getAttribute('aria-expanded')).toBe('true');

      await TestBed.inject(Router).navigate(['/prueba']);
      fixture.detectChanges();

      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('no deja desborde horizontal en los contenedores del menú (scrollWidth ≤ clientWidth)', async () => {
      await configure(user('STUDENT', ['records.read.own']));
      const shell = fixture.componentInstance as AppShell & { hasHorizontalOverflow(): boolean };
      const nav = fixture.nativeElement.querySelector('.nav-list') as HTMLElement;

      expect(shell.hasHorizontalOverflow()).withContext('menú en reposo').toBeFalse();

      // Un hijo ancho de más fuerza el peor caso: la medición debe detectarlo.
      const wide = document.createElement('div');
      wide.style.width = '2000px';
      wide.style.height = '1px';
      nav.appendChild(wide);
      fixture.detectChanges();
      expect(shell.hasHorizontalOverflow()).withContext('con un hijo que desborda').toBeTrue();

      wide.remove();
      fixture.detectChanges();
      expect(shell.hasHorizontalOverflow()).withContext('tras retirarlo').toBeFalse();
    });
  });
});
