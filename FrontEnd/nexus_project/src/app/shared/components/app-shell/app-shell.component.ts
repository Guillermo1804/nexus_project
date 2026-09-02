import { Component, signal, computed, inject, ChangeDetectionStrategy, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { MonitoringService } from '../../../core/services/monitoring.service';
import { PeriodService } from '../../../core/services/period.service';
import { UserRole } from '../../../core/models/user.model';
import { PillBadgeComponent } from '../pill-badge/pill-badge.component';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles?: UserRole[];
  exact?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  url: string;
}

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, PillBadgeComponent],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly monitoringService = inject(MonitoringService);
  readonly periodService = inject(PeriodService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  // Responsive and collapse state
  readonly isSidebarCollapsed = signal<boolean>(false);
  readonly isMobileMenuOpen = signal<boolean>(false);
  readonly isProfileMenuOpen = signal<boolean>(false);
  readonly isNotificationsMenuOpen = signal<boolean>(false);
  readonly selectedPeriod = this.periodService.activePeriod;


  // Dynamic breadcrumbs
  readonly breadcrumbs = signal<BreadcrumbItem[]>([
    { label: 'Inicio', url: '/' }
  ]);

  // Filtered navigation items based on current role and dynamic student id
  readonly filteredNavItems = computed<NavItem[]>(() => {
    const role = this.authService.currentUser()?.role || 'COORDINADOR';
    const studentId = this.authService.getStudentId() || 1;
    const items: NavItem[] = [];

    if (role === 'ADMIN' || role === 'COORDINADOR') {
      items.push({
        label: 'Dashboard',
        route: '/dashboard',
        icon: 'dashboard'
      });
    }

    if (role === 'ADMIN' || role === 'COORDINADOR' || role === 'ASESOR' || role === 'COASESOR' || role === 'COMITE') {
      items.push({
        label: 'Estudiantes',
        route: '/students',
        icon: 'users',
        exact: true
      });
    }

    items.push({
      label: role === 'ESTUDIANTE' ? 'Mi Expediente' : 'Expediente',
      route: `/students/${studentId}`,
      icon: 'folder'
    });

    items.push({
      label: 'Tutorías',
      route: role === 'ESTUDIANTE' ? `/students/${studentId}` : '/tutoring',
      icon: 'book'
    });

    items.push({
      label: 'Acuerdos',
      route: '/agreements',
      icon: 'check-square'
    });

    items.push({
      label: 'Producción',
      route: '/academic-output',
      icon: 'award'
    });

    if (role === 'ADMIN' || role === 'COORDINADOR' || role === 'ASESOR') {
      items.push({
        label: 'Reportes',
        route: '/reports',
        icon: 'file-text'
      });
    }

    return items;
  });

  readonly userRolePillType = computed(() => {
    const role = this.authService.currentUser()?.role;
    switch (role) {
      case 'COORDINADOR':
      case 'ADMIN':
        return 'INFO';
      case 'ASESOR':
      case 'COASESOR':
        return 'SUCCESS';
      case 'ESTUDIANTE':
        return 'EN_PROCESO';
      default:
        return 'INFO';
    }
  });

  constructor() {
    this.updateBreadcrumbs(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateBreadcrumbs(event.urlAfterRedirects || event.url);
      this.isMobileMenuOpen.set(false);
      this.isProfileMenuOpen.set(false);
      this.isNotificationsMenuOpen.set(false);
    });
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.monitoringService.refreshAlerts();
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed.update(prev => !prev);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(prev => !prev);
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update(prev => !prev);
    if (this.isProfileMenuOpen()) {
      this.isNotificationsMenuOpen.set(false);
    }
  }

  toggleNotificationsMenu(): void {
    this.isNotificationsMenuOpen.update(prev => !prev);
    if (this.isNotificationsMenuOpen()) {
      this.isProfileMenuOpen.set(false);
      this.monitoringService.refreshAlerts();
    }
  }

  closeMenus(): void {
    this.isProfileMenuOpen.set(false);
    this.isNotificationsMenuOpen.set(false);
  }

  onPeriodChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.periodService.setPeriod(select.value);
  }

  logout(): void {
    this.authService.logout();
  }

  private updateBreadcrumbs(url: string): void {
    const crumbs: BreadcrumbItem[] = [{ label: 'Inicio', url: '/' }];
    const cleanUrl = url.split('?')[0];

    if (cleanUrl.includes('/dashboard')) {
      crumbs.push({ label: 'Dashboard Coordinador', url: '/dashboard' });
    } else if (cleanUrl.startsWith('/students')) {
      crumbs.push({ label: 'Estudiantes', url: '/students' });
      const parts = cleanUrl.split('/');
      if (parts.length > 2 && parts[2]) {
        crumbs.push({ label: 'Expediente del Doctorando', url: cleanUrl });
      }
    } else if (cleanUrl.includes('/tutoring')) {
      crumbs.push({ label: 'Tutorías', url: '/tutoring' });
    } else if (cleanUrl.includes('/agreements')) {
      crumbs.push({ label: 'Acuerdos y Compromisos', url: '/agreements' });
    } else if (cleanUrl.includes('/academic-output')) {
      crumbs.push({ label: 'Producción Académica', url: '/academic-output' });
    } else if (cleanUrl.includes('/reports')) {
      crumbs.push({ label: 'Reportes Integrales', url: '/reports' });
    }

    this.breadcrumbs.set(crumbs);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-profile-menu')) {
      this.isProfileMenuOpen.set(false);
    }
    if (!target.closest('.nexus-notifications-box')) {
      this.isNotificationsMenuOpen.set(false);
    }
  }
}
