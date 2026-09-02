import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { MonitoringService } from '../../core/services/monitoring.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CoordinatorDashboardResponse } from '../../core/models/dashboard.model';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockMonitoringService: jasmine.SpyObj<MonitoringService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockDashboardData: CoordinatorDashboardResponse = {
    kpis: {
      total_estudiantes_activos: 10,
      total_tutorias_periodo: 15,
      total_acuerdos_activos: 6,
      total_acuerdos_vencidos: 2,
      tasa_cumplimiento_acuerdos: 75.0,
      promedio_avance_tesis: 62.5
    },
    semaforo_riesgo: {
      atencion_critica: 2,
      atencion_preventiva: 3,
      alumnos_al_dia: 5,
      total_evaluados: 10
    },
    tabla_priorizada: [
      {
        id: 1,
        matricula: 'DOC-2023-001',
        nombre: 'Juan Pérez',
        cohorte: '2023-A',
        asesor_principal: 'Dra. María González',
        dias_sin_tutoria: 70,
        dias_sin_tutoria_display: '70 días',
        acuerdos_vencidos: 2,
        avance_tesis: 50,
        nivel_riesgo: 'CRITICO',
        badge_color: '#A14D98',
        badge_bg: '#F8F1FF'
      },
      {
        id: 2,
        matricula: 'DOC-2024-002',
        nombre: 'Ana Gómez',
        cohorte: '2024-A',
        asesor_principal: 'Dr. Carlos Ramírez',
        dias_sin_tutoria: 50,
        dias_sin_tutoria_display: '50 días',
        acuerdos_vencidos: 0,
        avance_tesis: 30,
        nivel_riesgo: 'PREVENTIVO',
        badge_color: '#B57136',
        badge_bg: '#FEF8F3'
      },
      {
        id: 3,
        matricula: 'DOC-2024-003',
        nombre: 'Luis Martínez',
        cohorte: '2024-A',
        asesor_principal: 'Dra. María González',
        dias_sin_tutoria: 15,
        dias_sin_tutoria_display: '15 días',
        acuerdos_vencidos: 0,
        avance_tesis: 80,
        nivel_riesgo: 'AL_DIA',
        badge_color: '#437E5C',
        badge_bg: '#E9FEF1'
      }
    ],
    distribucion_cohorte: [
      { cohorte: '2023-A', promedio_avance: 50.0, total_estudiantes: 1 },
      { cohorte: '2024-A', promedio_avance: 55.0, total_estudiantes: 2 }
    ]
  };

  beforeEach(async () => {
    mockMonitoringService = jasmine.createSpyObj('MonitoringService', ['getCoordinatorDashboard']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockMonitoringService.getCoordinatorDashboard.and.returnValue(of(mockDashboardData));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: MonitoringService, useValue: mockMonitoringService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create the dashboard component', () => {
    expect(component).toBeTruthy();
  });

  it('should load dashboard data on init', () => {
    component.ngOnInit();
    expect(mockMonitoringService.getCoordinatorDashboard).toHaveBeenCalled();
    expect(component.loading()).toBeFalse();
    expect(component.kpis()?.total_estudiantes_activos).toBe(10);
    expect(component.prioritizedStudents().length).toBe(3);
    expect(component.cohortDistribution().length).toBe(2);
  });

  it('should handle error when dashboard fails to load', () => {
    mockMonitoringService.getCoordinatorDashboard.and.returnValue(
      throwError(() => new Error('Error de conexión'))
    );
    component.loadDashboard();
    expect(component.loading()).toBeFalse();
    expect(component.error()).toContain('Error');
  });

  it('should filter students by risk level', () => {
    component.ngOnInit();
    component.setRiskFilter('CRITICO');
    expect(component.filteredStudents().length).toBe(1);
    expect(component.filteredStudents()[0].matricula).toBe('DOC-2023-001');

    component.setRiskFilter('AL_DIA');
    expect(component.filteredStudents().length).toBe(1);
    expect(component.filteredStudents()[0].matricula).toBe('DOC-2024-003');
  });

  it('should filter students by cohort', () => {
    component.ngOnInit();
    component.setCohortFilter('2023-A');
    expect(component.filteredStudents().length).toBe(1);
    expect(component.filteredStudents()[0].matricula).toBe('DOC-2023-001');

    component.setCohortFilter('2024-A');
    expect(component.filteredStudents().length).toBe(2);
  });

  it('should filter students by search term', () => {
    component.ngOnInit();
    component.onSearchChange('ana');
    expect(component.filteredStudents().length).toBe(1);
    expect(component.filteredStudents()[0].nombre).toBe('Ana Gómez');
  });

  it('should clear all filters', () => {
    component.ngOnInit();
    component.setRiskFilter('CRITICO');
    component.setCohortFilter('2023-A');
    component.onSearchChange('Juan');

    component.clearFilters();
    expect(component.riskFilter()).toBe('TODOS');
    expect(component.cohortFilter()).toBe('TODAS');
    expect(component.searchTerm()).toBe('');
    expect(component.filteredStudents().length).toBe(3);
  });

  it('should navigate to student overview on view click', () => {
    component.navigateToStudent(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/students', 1]);
  });
});
