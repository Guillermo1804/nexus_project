import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgreementsListComponent } from './agreements-list.component';
import { AgreementService } from '../../../core/services/agreement.service';
import { StudentService } from '../../../core/services/student.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { Agreement } from '../../../core/models/agreement.model';
import { PaginatedResponse, Student } from '../../../core/models/student.model';

describe('AgreementsListComponent', () => {
  let component: AgreementsListComponent;
  let fixture: ComponentFixture<AgreementsListComponent>;
  let agreementService: AgreementService;
  let studentService: StudentService;

  const mockAgreements: Agreement[] = [
    {
      id: 1,
      studentId: 1,
      studentName: 'María González López',
      studentMatricula: 'DOC-2023-042',
      semesterNumber: 3,
      title: 'Completar benchmark de modelos',
      description: 'Ejecutar pruebas experimentales BERT',
      responsibleId: 101,
      responsibleName: 'María González López',
      responsibleRole: 'Doctorando',
      dueDate: '2024-12-15',
      status: 'PENDIENTE',
      isOverdue: false,
      createdAt: '2024-11-20T10:00:00Z',
      updatedAt: '2024-11-20T10:00:00Z'
    },
    {
      id: 2,
      studentId: 1,
      studentName: 'María González López',
      studentMatricula: 'DOC-2023-042',
      semesterNumber: 3,
      title: 'Revisión del borrador Capítulo 3',
      description: 'Revisión por comité asesor',
      responsibleId: 2,
      responsibleName: 'Dr. Roberto Mendoza',
      responsibleRole: 'Asesor Principal',
      dueDate: '2024-12-20',
      status: 'EN_PROCESO',
      isOverdue: false,
      createdAt: '2024-11-20T10:00:00Z',
      updatedAt: '2024-11-25T10:00:00Z'
    },
    {
      id: 3,
      studentId: 2,
      studentName: 'Carlos Ramírez Soto',
      studentMatricula: 'DOC-2022-019',
      semesterNumber: 5,
      title: 'Entrega de constancia de seminario',
      description: 'Constancia de asistencia obligatoria',
      responsibleId: 102,
      responsibleName: 'Carlos Ramírez Soto',
      responsibleRole: 'Doctorando',
      dueDate: '2024-10-30',
      status: 'VENCIDO',
      isOverdue: true,
      createdAt: '2024-10-01T10:00:00Z',
      updatedAt: '2024-11-01T10:00:00Z'
    },
    {
      id: 4,
      studentId: 1,
      studentName: 'María González López',
      studentMatricula: 'DOC-2023-042',
      semesterNumber: 2,
      title: 'Envío de artículo a revista',
      description: 'Publicación en journal Q2',
      responsibleId: 101,
      responsibleName: 'María González López',
      responsibleRole: 'Doctorando',
      dueDate: '2024-05-15',
      status: 'CONCLUIDO',
      isOverdue: false,
      createdAt: '2024-04-10T10:00:00Z',
      updatedAt: '2024-05-12T10:00:00Z'
    }
  ];

  const mockStudentsResponse: PaginatedResponse<Student> = {
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        id: 1,
        userId: 101,
        matricula: 'DOC-2023-042',
        nombre_completo: 'María González López',
        programa_doctoral: 'Doctorado en Ciencias de la Computación',
        cohorte: '2023-B',
        currentSemester: 3,
        status: 'ACTIVO',
        estatus_activo: true,
        researchLine: 'Inteligencia Artificial',
        thesisTitle: 'Modelos de Lenguaje',
        enrollmentDate: '2023-08-15',
        expectedGraduationDate: '2026-07-31'
      },
      {
        id: 2,
        userId: 102,
        matricula: 'DOC-2022-019',
        nombre_completo: 'Carlos Ramírez Soto',
        programa_doctoral: 'Doctorado en Biotecnología',
        cohorte: '2022-A',
        currentSemester: 5,
        status: 'ACTIVO',
        estatus_activo: true,
        researchLine: 'Nanopartículas',
        thesisTitle: 'Síntesis Polimérica',
        enrollmentDate: '2022-01-20',
        expectedGraduationDate: '2025-01-31'
      }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgreementsListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AgreementService,
        StudentService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AgreementsListComponent);
    component = fixture.componentInstance;
    agreementService = TestBed.inject(AgreementService);
    studentService = TestBed.inject(StudentService);

    spyOn(agreementService, 'getAgreements').and.returnValue(of(mockAgreements));
    spyOn(studentService, 'getStudents').and.returnValue(of(mockStudentsResponse));

    fixture.detectChanges();
  });

  it('should create AgreementsListComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should load agreements and compute summary counts correctly', () => {
    expect(component.rawAgreements().length).toBe(4);
    expect(component.totalCount()).toBe(4);
    expect(component.pendingCount()).toBe(1);
    expect(component.inProgressCount()).toBe(1);
    expect(component.concludedCount()).toBe(1);
    expect(component.overdueCount()).toBe(1);
  });

  it('should filter agreements by status correctly', () => {
    component.setStatusFilter('PENDIENTE');
    expect(component.filteredAgreements().length).toBe(1);
    expect(component.filteredAgreements()[0].status).toBe('PENDIENTE');

    component.setStatusFilter('VENCIDO');
    expect(component.filteredAgreements().length).toBe(1);
    expect(component.filteredAgreements()[0].status).toBe('VENCIDO');

    component.setStatusFilter('TODOS');
    expect(component.filteredAgreements().length).toBe(4);
  });

  it('should filter agreements by search term', () => {
    component.onSearchChange('benchmark');
    expect(component.filteredAgreements().length).toBe(1);
    expect(component.filteredAgreements()[0].title).toContain('benchmark');

    component.onSearchChange('Carlos');
    expect(component.filteredAgreements().length).toBe(1);
    expect(component.filteredAgreements()[0].studentName).toContain('Carlos');

    component.removeSearchFilter();
    expect(component.filteredAgreements().length).toBe(4);
  });

  it('should filter agreements by student ID', () => {
    const fakeEvent = { target: { value: '2' } } as any;
    component.onStudentChange(fakeEvent);
    expect(component.selectedStudentId()).toBe(2);
    expect(component.filteredAgreements().length).toBe(1);
    expect(component.filteredAgreements()[0].studentId).toBe(2);
  });

  it('should clear all filters when clearAllFilters() is invoked', () => {
    component.setStatusFilter('VENCIDO');
    component.onSearchChange('test');
    component.selectedStudentId.set(1);
    expect(component.activeFiltersCount()).toBeGreaterThan(0);

    component.clearAllFilters();
    expect(component.selectedStatusFilter()).toBe('TODOS');
    expect(component.searchTerm()).toBe('');
    expect(component.selectedStudentId()).toBe('ALL');
    expect(component.activeFiltersCount()).toBe(0);
  });

  it('should open drawer in CREATE mode', () => {
    component.openCreateDrawer();
    expect(component.isDrawerOpen()).toBeTrue();
    expect(component.drawerMode()).toBe('CREATE');
    expect(component.selectedAgreement()).toBeNull();
  });

  it('should open drawer in STATUS_UPDATE mode with selected agreement', () => {
    component.openUpdateStatusDrawer(mockAgreements[0]);
    expect(component.isDrawerOpen()).toBeTrue();
    expect(component.drawerMode()).toBe('STATUS_UPDATE');
    expect(component.selectedAgreement()).toEqual(mockAgreements[0]);
  });

  it('should update agreement list when onAgreementSaved is called', () => {
    const updatedAgr: Agreement = {
      ...mockAgreements[0],
      status: 'CONCLUIDO'
    };
    component.drawerMode.set('STATUS_UPDATE');
    component.onAgreementSaved(updatedAgr);

    const found = component.rawAgreements().find(a => a.id === 1);
    expect(found?.status).toBe('CONCLUIDO');
  });
});
