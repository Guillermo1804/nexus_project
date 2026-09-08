import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppShellComponent } from './app-shell.component';
import { AuthService } from '../../../core/services/auth.service';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('AppShellComponent', () => {
  let component: AppShellComponent;
  let fixture: ComponentFixture<AppShellComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the AppShellComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle sidebar collapsed state', () => {
    expect(component.isSidebarCollapsed()).toBeFalse();
    component.toggleSidebar();
    expect(component.isSidebarCollapsed()).toBeTrue();
    component.toggleSidebar();
    expect(component.isSidebarCollapsed()).toBeFalse();
  });

  it('should toggle profile menu', () => {
    expect(component.isProfileMenuOpen()).toBeFalse();
    component.toggleProfileMenu();
    expect(component.isProfileMenuOpen()).toBeTrue();
    component.closeMenus();
    expect(component.isProfileMenuOpen()).toBeFalse();
  });

  it('should filter nav items according to role', () => {
    authService.setCurrentUserForDev({
      id: 10,
      username: 'estudiante1',
      email: 'estudiante@posgrado.edu',
      firstName: 'Ana',
      lastName: 'Pérez',
      fullName: 'Ana Pérez',
      role: 'ESTUDIANTE',
      isActive: true
    });
    fixture.detectChanges();

    const items = component.filteredNavItems();
    const dashboardItem = items.find(i => i.label === 'Dashboard');
    expect(dashboardItem).toBeUndefined(); // Dashboard is coordinator only

    const expedItem = items.find(i => i.label === 'Expediente');
    expect(expedItem).toBeDefined();
  });

  it('should render breadcrumbs correctly', () => {
    const crumbs = component.breadcrumbs();
    expect(crumbs.length).toBeGreaterThan(0);
    expect(crumbs[0].label).toBe('Inicio');
  });
});
