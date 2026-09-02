import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgreementDrawerComponent } from './agreement-drawer.component';
import { AgreementService } from '../../../core/services/agreement.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { Agreement } from '../../../core/models/agreement.model';

describe('AgreementDrawerComponent', () => {
  let component: AgreementDrawerComponent;
  let fixture: ComponentFixture<AgreementDrawerComponent>;
  let agreementService: AgreementService;

  const mockAgreement: Agreement = {
    id: 1,
    student: 1,
    studentId: 1,
    student_nombre: 'María González López',
    studentName: 'María González López',
    session: 101,
    tutoringSessionId: 101,
    descripcion: 'Completar benchmark de modelos',
    title: 'Completar benchmark de modelos',
    description: 'Ejecutar las pruebas experimentales',
    responsable: 101,
    responsibleId: 101,
    responsable_nombre: 'María González López',
    responsibleName: 'María González López',
    fecha_limite: '2025-04-15',
    dueDate: '2025-04-15',
    estado: 'PENDIENTE',
    status: 'PENDIENTE',
    is_vencido: false,
    isOverdue: false,
    created_at: '2025-02-20T10:00:00Z',
    createdAt: '2025-02-20T10:00:00Z',
    updated_at: '2025-02-20T10:00:00Z',
    updatedAt: '2025-02-20T10:00:00Z'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgreementDrawerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AgreementService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AgreementDrawerComponent);
    component = fixture.componentInstance;
    agreementService = TestBed.inject(AgreementService);
  });

  it('should create AgreementDrawerComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should emit close and closed events when onClose() is called', () => {
    let closeCalled = false;
    let closedCalled = false;
    component.close.subscribe(() => {
      closeCalled = true;
    });
    component.closed.subscribe(() => {
      closedCalled = true;
    });
    component.onClose();
    expect(closeCalled).toBeTrue();
    expect(closedCalled).toBeTrue();
  });

  it('should handle status selection in STATUS_UPDATE mode', () => {
    component.onSelectStatus('EN_PROCESO');
    expect(component.selectedNewStatus()).toBe('EN_PROCESO');
    expect(component.updateForm.value.status).toBe('EN_PROCESO');
  });

  it('should validate createForm requires title and description', () => {
    component.createForm.patchValue({
      title: '',
      description: ''
    });
    expect(component.createForm.invalid).toBeTrue();

    component.createForm.patchValue({
      title: 'Valid Title for Agreement',
      description: 'Valid Description with enough length',
      dueDate: '2025-12-31'
    });
    expect(component.createForm.valid).toBeTrue();
  });

  it('should call agreementService.updateAgreementStatus when submitUpdate is executed', () => {
    spyOn(agreementService, 'updateAgreementStatus').and.returnValue(of({
      ...mockAgreement,
      estado: 'CONCLUIDO',
      status: 'CONCLUIDO'
    }));

    // Bind inputs
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('mode', 'STATUS_UPDATE');
    fixture.componentRef.setInput('agreement', mockAgreement);
    fixture.detectChanges();

    component.onSelectStatus('CONCLUIDO');
    component.submitUpdate();

    expect(agreementService.updateAgreementStatus).toHaveBeenCalledWith(1, {
      estado: 'CONCLUIDO',
      status: 'CONCLUIDO',
      comentario: '',
      resolutionNotes: ''
    } as any);
  });
});
