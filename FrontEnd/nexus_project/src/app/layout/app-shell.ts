import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, finalize } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../core/auth/auth.service';
import { getRoleLabelByGender } from '../shared/presentation/role-labels';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
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

  protected userName(): string {
    const user = this.auth.user();
    return user ? `${user.first_name} ${user.last_name}`.trim() || user.email : '';
  }

  protected roleLabel(): string {
    const user = this.auth.user();
    return getRoleLabelByGender(user?.role, user?.grammatical_gender);
  }

  protected isSystemAdmin(): boolean {
    return this.auth.user()?.role === 'SYSTEM_ADMIN';
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
