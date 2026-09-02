import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { FullDossierReportComponent } from './full-dossier-report.component';
import { ReportingService } from '../../../core/services/reporting.service';
import { FullDossier } from '../../../core/models/dossier.model';

const mockDossier: FullDossier = {
  student: {
    id: 1,
    matricula: 'DOC-2024-001',
    nombre_completo: 'Ing. Carlos Mendoza',
    programa_doctoral: 'Doctorado en Ciencias',
    cohorte: '2024-A',
    estatus_activo: true,
    created_at: '2024-01-15T08:00:00Z',
    user: {
      id: 1,
      email: 'carlos.mendoza@nexus.edu',
      first_name: 'Carlos',
      last_name: 'Mendoza',
      full_name: 'Carlos Mendoza',
      role: 'ESTUDIANTE'
    }
  },
  committee: [
    {
      id: 1,
      user: {
        id: 2,
        email: 'asesor@nexus.edu',
        first_name: 'Roberto',
        last_name: 'Asesor',
        full_name: 'Dr. Roberto Asesor',
        role: 'ASESOR'
      },
      rol_comite: 'ASESOR_PRINCIPAL',
      rol_comite_display: 'Asesor Principal / Director',
      fecha_asignacion: '2024-01-20',
      is_active: true
    }
  ],
  semesters: [
    {
      id: 1,
      numero: 1,
      fecha_inicio: '2024-01-15',
      fecha_fin: '2024-06-30',
      is_active: false
    }
  ],
  tutoring_sessions: [
    {
      id: 1,
      semester_id: 1,
      semester_numero: 1,
      fecha_sesion: '2024-03-10',
      modalidad: 'PRESENCIAL',
      modalidad_display: 'Presencial',
      resumen: 'Revisión general del avance y acuerdos.',
      proxima_reunion_fecha: '2024-04-10',
      proxima_reunion_notas: 'Revisión capítulo 2',
      created_at: '2024-03-10T10:00:00Z',
      participants: [],
      observations: []
    }
  ],
  agreements: [
    {
      id: 1,
      session_id: 1,
      session_fecha: '2024-03-10',
      descripcion: 'Entrega de marco teórico',
      responsable_id: 1,
      responsable_nombre: 'Carlos Mendoza',
      responsable_email: 'carlos.mendoza@nexus.edu',
      fecha_limite: '2024-04-15',
      estado: 'CONCLUIDO',
      estado_display: 'Concluido',
      fecha_conclusion: '2024-04-14',
      is_vencido: false,
      created_at: '2024-03-10T10:00:00Z',
      audit_logs: [],
      evidences: []
    }
  ],
  thesis_progress: [
    {
      id: 1,
      semester_id: 1,
      semester_numero: 1,
      porcentaje_avance: 65,
      componentes_json: { protocolo: 100, marcoTeorico: 80 },
      observaciones: 'Avance adecuado',
      fecha_registro: '2024-06-01',
      created_at: '2024-06-01T10:00:00Z'
    }
  ],
  publications: [],
  academic_events: [],
  research_stays: [],
  other_products: [],
  evidences: [],
  kpis: {
    total_tutorias: 1,
    total_acuerdos: 1,
    acuerdos_concluidos: 1,
    acuerdos_pendientes: 0,
    acuerdos_en_proceso: 0,
    acuerdos_vencidos: 0,
    tasa_cumplimiento_acuerdos: 100,
    ultimo_porcentaje_tesis: 65,
    ultima_actualizacion_tesis: '2024-06-01',
    total_publicaciones: 0,
    total_eventos_academicos: 0,
    total_estancias_investigacion: 0,
    total_otros_productos: 0,
    total_evidencias: 0
  },
  generated_at: '2025-05-18T10:00:00Z',
  generated_by: {
    id: 9,
    email: 'coord@nexus.edu',
    first_name: 'María',
    last_name: 'Coordinadora',
    full_name: 'Dra. María Coordinadora',
    role: 'COORDINADOR'
  }
};

describe('FullDossierReportComponent', () => {
  let component: FullDossierReportComponent;
  let fixture: ComponentFixture<FullDossierReportComponent>;
  let reportingServiceSpy: jasmine.SpyObj<ReportingService>;

  beforeEach(async () => {
    reportingServiceSpy = jasmine.createSpyObj('ReportingService', ['getFullDossier']);
    reportingServiceSpy.getFullDossier.and.returnValue(of(mockDossier));

    await TestBed.configureTestingModule({
      imports: [FullDossierReportComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? '1' : null)
              }
            }
          }
        },
        { provide: ReportingService, useValue: reportingServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FullDossierReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the full dossier component', () => {
    expect(component).toBeTruthy();
  });

  it('should load dossier data on init and populate signals', () => {
    expect(reportingServiceSpy.getFullDossier).toHaveBeenCalledWith(1);
    expect(component.dossier()).toEqual(mockDossier);
    expect(component.student()?.matricula).toBe('DOC-2024-001');
    expect(component.kpis()?.total_acuerdos).toBe(1);
  });

  it('should toggle sections correctly in interactive UI mode', () => {
    expect(component.isSectionCollapsed('student')).toBeFalse();
    component.toggleSection('student');
    expect(component.isSectionCollapsed('student')).toBeTrue();
    component.toggleSection('student');
    expect(component.isSectionCollapsed('student')).toBeFalse();
  });

  it('should expand and collapse all sections on demand', () => {
    component.collapseAll();
    expect(component.isSectionCollapsed('thesis')).toBeTrue();
    expect(component.isSectionCollapsed('agreements')).toBeTrue();

    component.expandAll();
    expect(component.isSectionCollapsed('thesis')).toBeFalse();
    expect(component.isSectionCollapsed('agreements')).toBeFalse();
  });

  it('should trigger window.print when printDossier is called', () => {
    spyOn(window, 'print');
    component.printDossier();
    expect(window.print).toHaveBeenCalled();
  });

  it('should correctly format agreement status badge types', () => {
    expect(component.getAgreementBadgeType('CONCLUIDO')).toBe('CONCLUIDO');
    expect(component.getAgreementBadgeType('EN_PROCESO')).toBe('EN_PROCESO');
    expect(component.getAgreementBadgeType('VENCIDO')).toBe('VENCIDO');
    expect(component.getAgreementBadgeType('PENDIENTE')).toBe('PENDIENTE');
  });

  it('should format file sizes accurately', () => {
    expect(component.formatFileSize(500)).toBe('500 B');
    expect(component.formatFileSize(2048)).toBe('2.0 KB');
    expect(component.formatFileSize(1048576 * 3)).toBe('3.0 MB');
  });
});
