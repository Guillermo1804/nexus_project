import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastHostComponent } from '../shared/toast-host.component';
import { filter, finalize } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AcademicService } from '../core/academic/academic.service';
import { AgreementAlertsResponse } from '../core/academic/academic.models';
import { UserRole } from '../core/auth/auth.models';
import { AuthService } from '../core/auth/auth.service';
import { getRoleLabelByGender } from '../shared/presentation/role-labels';

/** Mirrors the `allowedRoles` of the agreements route so the link never leads to a redirect. */
const AGREEMENT_ROLES: UserRole[] = ['STUDENT', 'TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR'];

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ToastHostComponent],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly academic = inject(AcademicService);
  private readonly router = inject(Router);
  protected readonly alerts = signal<AgreementAlertsResponse | null>(null);
  protected readonly agreementAlertCount = computed(() => this.alerts()?.total_alertas ?? 0);
  private readonly navigation = toSignal(
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)),
    { initialValue: null },
  );
  protected isLeaving = false;
  protected readonly viewTitle = computed(() => {
    this.navigation();
    const url = this.router.url.split('?')[0];
    if (url === '/home') return 'Inicio';
    if (url === '/acuerdos') return 'Acuerdos';
    if (url.startsWith('/expediente/')) return 'Expediente';
    if (url === '/coordinator/students/new') return 'Registrar estudiante';
    if (url === '/coordinator/committee') return 'Comité';
    if (url === '/admin/roles') return 'Roles';
    if (url === '/admin/users') return 'Usuarios';
    if (url === '/admin/audit') return 'Auditoría';
    return 'Inicio';
  });

  ngOnInit(): void {
    if (!this.auth.isAuthenticated() || !this.canViewAgreements()) return;
    this.academic.getAgreementAlerts().subscribe({
      next: response => this.alerts.set(response),
      error: () => this.alerts.set(null),
    });
  }

  protected userName(): string {
    const user = this.auth.user();
    return user ? `${user.first_name} ${user.last_name}`.trim() || user.email : '';
  }

  protected roleLabel(): string {
    const user = this.auth.user();
    return getRoleLabelByGender(user?.role, user?.grammatical_gender);
  }

  /**
   * Explica qué cuenta el número del menú. Antes era una cifra suelta que podía
   * ser de vencidos o de próximos vencimientos y no decía de qué.
   */
  protected alertSummary(): string {
    const alerts = this.alerts();
    if (!alerts || !alerts.total_alertas) return '';
    const partes: string[] = [];
    if (alerts.vencidos_count) partes.push(`${alerts.vencidos_count} ${alerts.vencidos_count === 1 ? 'vencido' : 'vencidos'}`);
    if (alerts.proximos_vencer_count) partes.push(`${alerts.proximos_vencer_count} ${alerts.proximos_vencer_count === 1 ? 'por vencer' : 'por vencer'}`);
    return `${partes.join(' y ')}. Revisar acuerdos con atención.`;
  }

  protected hasVencidos(): boolean { return (this.alerts()?.vencidos_count ?? 0) > 0; }

  protected isSystemAdmin(): boolean {
    return this.auth.user()?.role === 'SYSTEM_ADMIN';
  }

  protected canViewAgreements(): boolean {
    const role = this.auth.user()?.role;
    return !!role && AGREEMENT_ROLES.includes(role);
  }

  protected logout(): void {
    if (this.isLeaving) return;
    this.isLeaving = true;
    this.auth.logout().pipe(
      finalize(() => {
        this.auth.clearSession();
        void this.router.navigate(['/login']);
      }),
    ).subscribe({ error: () => undefined });
  }
}
