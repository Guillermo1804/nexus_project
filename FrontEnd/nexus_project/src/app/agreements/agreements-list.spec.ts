import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AgreementsListComponent } from './agreements-list';
import { AcademicService } from '../core/academic/academic.service';
import { AuthService } from '../core/auth/auth.service';
import { StudentService } from '../core/students/student.service';
import { AuthenticatedUser } from '../core/auth/auth.models';

describe('AgreementsListComponent (HU-14)', () => {
  let fixture: ComponentFixture<AgreementsListComponent>;
  let component: AgreementsListComponent;

  const userSignal = signal<AuthenticatedUser | null>({
    id: 1,
    email: 'coord@nexus.edu',
    first_name: 'Coord',
    last_name: 'Demo',
    role: 'PROGRAM_COORDINATOR',
    roles: ['PROGRAM_COORDINATOR'],
    permissions: ['academic.read.global'],
  });

  const academicStub = {
    getAgreements: jasmine.createSpy('getAgreements').and.returnValue(
      of({
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 85,
            student: 4,
            student_nombre: 'Diego Fuentes',
            student_matricula: 'DOC250002',
            session: 12,
            semester: 3,
            semester_numero: 2,
            descripcion: 'Entregar capítulo 3',
            responsable: 15,
            responsable_nombre: 'Diego Fuentes',
            fecha_limite: '2026-08-30',
            estado: 'PENDIENTE',
            is_vencido: true,
          },
        ],
      }),
    ),
    getGlobalOverview: jasmine.createSpy('getGlobalOverview').and.returnValue(
      of({ count: 1, next: null, previous: null, results: [{ id: 4, matricula: 'DOC250002', nombre_completo: 'Diego Fuentes', programa_doctoral: 'DCC', cohorte: '2025', estatus_activo: true }] }),
    ),
    getStudentSemesters: jasmine.createSpy('getStudentSemesters').and.returnValue(
      of([{ id: 3, student: 4, numero: 2, fecha_inicio: '2026-01-01', fecha_fin: '2026-06-30', is_active: true }]),
    ),
    getAgreementAuditLog: jasmine.createSpy('getAgreementAuditLog').and.returnValue(of([])),
    updateAgreementStatus: jasmine.createSpy('updateAgreementStatus').and.returnValue(of({})),
  };

  const authStub = {
    user: userSignal,
    hasPermission: (p: string) => p === 'academic.read.global',
  };

  const studentStub = {
    getStudents: jasmine.createSpy('getStudents').and.returnValue(of({ count: 0, next: null, previous: null, results: [] })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgreementsListComponent],
      providers: [
        provideRouter([]),
        { provide: AcademicService, useValue: academicStub },
        { provide: AuthService, useValue: authStub },
        { provide: StudentService, useValue: studentStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgreementsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga y muestra acuerdos vencidos', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(academicStub.getAgreements).toHaveBeenCalled();
    expect(text).toContain('Entregar capítulo 3');
    expect(text).toContain('VENCIDO');
    expect(text).toContain('Diego Fuentes');
  });

  it('abre la edición y guarda únicamente la siguiente transición', () => {
    const agreement = component['agreements'][0];
    component['abrirEdicion'](agreement);

    expect(component['isStatusEnabled']('EN_PROCESO')).toBeTrue();
    expect(component['isStatusEnabled']('CONCLUIDO')).toBeFalse();

    component['selectStatus']('EN_PROCESO');
    component['comentario'] = 'Inicio de avance';
    component['guardarCambios']();

    expect(academicStub.updateAgreementStatus).toHaveBeenCalledWith(85, 'EN_PROCESO', 'Inicio de avance');
  });

  it('aplica filtros combinados al endpoint', () => {
    academicStub.getAgreements.calls.reset();
    component['filtroStudent'] = '4';
    component['filtroSemester'] = '3';
    component['filtroEstado'] = 'VENCIDO';
    component['filtroResponsable'] = '15';
    component['filtroFechaDesde'] = '2026-01-01';
    component['filtroFechaHasta'] = '2026-12-31';
    component['aplicarFiltros']();

    expect(academicStub.getAgreements).toHaveBeenCalledWith(
      jasmine.objectContaining({
        page: 1,
        student: 4,
        semester: 3,
        responsable: 15,
        vencido: true,
        fecha_desde: '2026-01-01',
        fecha_hasta: '2026-12-31',
      }),
    );
  });
});
