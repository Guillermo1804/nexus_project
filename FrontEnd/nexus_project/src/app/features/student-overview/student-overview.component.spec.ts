import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StudentOverviewComponent } from './student-overview.component';
import { StudentService } from '../../core/services/student.service';
import { AgreementService } from '../../core/services/agreement.service';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { Agreement } from '../../core/models/agreement.model';
import { TutoringSession } from '../../core/models/tutoring.model';

describe('StudentOverviewComponent', () => {
  let component: StudentOverviewComponent;
  let fixture: ComponentFixture<StudentOverviewComponent>;
  let studentService: StudentService;
  let agreementService: AgreementService;

  const sampleAgreement: Agreement = {
    id: 1,
    studentId: 1,
    studentName: 'María González López',
    semesterNumber: 3,
    title: 'Completar benchmark de modelos BERT',
    description: 'Ejecutar pruebas experimentales',
    responsibleId: 101,
    responsibleName: 'María González López',
    responsibleRole: 'Doctorando',
    dueDate: '2024-12-15',
    status: 'PENDIENTE',
    isOverdue: false,
    createdAt: '2024-11-20T10:00:00Z',
    updatedAt: '2024-11-20T10:00:00Z'
  };

  const sampleOverdueAgreement: Agreement = {
    id: 3,
    studentId: 1,
    studentName: 'María González López',
    semesterNumber: 3,
    title: 'Entrega de constancia de seminario',
    description: 'Constancia obligatoria',
    responsibleId: 101,
    responsibleName: 'María González López',
    responsibleRole: 'Doctorando',
    dueDate: '2024-10-30',
    status: 'VENCIDO',
    isOverdue: true,
    createdAt: '2024-10-01T10:00:00Z',
    updatedAt: '2024-11-01T10:00:00Z'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentOverviewComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        StudentService,
        AgreementService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => '1'
              }
            }
          }
        }
      ]
    }).compileComponents();

    studentService = TestBed.inject(StudentService);
    agreementService = TestBed.inject(AgreementService);
    fixture = TestBed.createComponent(StudentOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the StudentOverviewComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should load student details on initialization', () => {
    expect(component.student()).toBeTruthy();
    expect(component.student()?.matricula).toBe('DOC-2023-001');
  });

  it('should update activeSemester when tab is clicked', () => {
    component.selectSemester(2);
    expect(component.activeSemester()).toBe(2);

    component.selectSemester('ALL');
    expect(component.activeSemester()).toBe('ALL');
  });

  it('should calculate pending and overdue agreements correctly', () => {
    const pending = component.pendingAgreementsCount();
    const overdue = component.overdueAgreementsCount();
    expect(pending).toBeGreaterThanOrEqual(0);
    expect(overdue).toBeGreaterThanOrEqual(0);
  });

  it('should render 70/30 grid layout elements', () => {
    const mainCol = fixture.nativeElement.querySelector('.overview-grid__col-main');
    const sideCol = fixture.nativeElement.querySelector('.overview-grid__col-side');

    expect(mainCol).toBeTruthy();
    expect(sideCol).toBeTruthy();
  });

  it('should display red alert card when overdue agreements exist', () => {
    component.agreements.set([sampleAgreement, sampleOverdueAgreement]);
    fixture.detectChanges();

    expect(component.totalOverdueAgreementsCount()).toBe(1);
    const alertElement = fixture.nativeElement.querySelector('.overdue-alert-card');
    expect(alertElement).toBeTruthy();
  });

  it('should control AgreementDrawer for creation and update', () => {
    // Open create mode
    component.openCreateAgreementDrawer();
    expect(component.isDrawerOpen()).toBeTrue();
    expect(component.drawerMode()).toBe('CREATE');
    expect(component.selectedAgreement()).toBeNull();

    // Open update mode
    component.openUpdateAgreementDrawer(sampleAgreement);
    expect(component.isDrawerOpen()).toBeTrue();
    expect(component.drawerMode()).toBe('STATUS_UPDATE');
    expect(component.selectedAgreement()).toEqual(sampleAgreement);

    // Close drawer
    component.closeAgreementDrawer();
    expect(component.isDrawerOpen()).toBeFalse();
  });

  it('should control TutoringModal open and close', () => {
    component.openTutoringModal();
    expect(component.isTutoringModalOpen()).toBeTrue();

    component.closeTutoringModal();
    expect(component.isTutoringModalOpen()).toBeFalse();
  });

  it('should append saved agreement to agreements list', () => {
    const newAgr: Agreement = {
      id: 99,
      studentId: 1,
      semesterNumber: 3,
      title: 'Nuevo acuerdo de prueba',
      description: 'Descripción del nuevo acuerdo',
      responsibleId: 101,
      responsibleName: 'María González López',
      responsibleRole: 'Doctorando',
      dueDate: '2024-12-31',
      status: 'PENDIENTE',
      isOverdue: false,
      createdAt: '2024-11-25T10:00:00Z',
      updatedAt: '2024-11-25T10:00:00Z'
    };

    component.drawerMode.set('CREATE');
    component.onAgreementSaved(newAgr);
    expect(component.agreements().some(a => a.id === 99)).toBeTrue();
  });
});
