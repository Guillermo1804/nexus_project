import { Component, input, output, signal, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Agreement, AgreementStatus, AgreementAuditLog } from '../../../core/models/agreement.model';
import { AgreementService } from '../../../core/services/agreement.service';
import { PillBadgeComponent } from '../../../shared/components/pill-badge/pill-badge.component';

@Component({
  selector: 'app-agreement-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PillBadgeComponent],
  templateUrl: './agreement-drawer.component.html',
  styleUrls: ['./agreement-drawer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgreementDrawerComponent {
  private fb = inject(FormBuilder);
  private agreementService = inject(AgreementService);

  readonly isOpen = input<boolean>(false);
  readonly mode = input<'CREATE' | 'STATUS_UPDATE'>('CREATE');
  readonly agreement = input<Agreement | null>(null);
  readonly studentId = input<number | undefined>(1);
  readonly semesterNumber = input<number | undefined>(3);

  // Outputs duales para compatibilidad total con templates padres
  readonly close = output<void>();
  readonly closed = output<void>();
  readonly saved = output<Agreement>();

  readonly isSubmitting = signal<boolean>(false);
  readonly auditLogs = signal<AgreementAuditLog[]>([]);
  readonly selectedNewStatus = signal<AgreementStatus>('PENDIENTE');

  // Form for CREATE mode
  readonly createForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    responsibleId: [101, [Validators.required]],
    responsibleName: ['María González López', [Validators.required]],
    responsibleRole: ['Doctorando', [Validators.required]],
    dueDate: ['', [Validators.required]],
    semesterNumber: [3, [Validators.required]]
  });

  // Form for STATUS_UPDATE mode
  readonly updateForm = this.fb.group({
    status: ['PENDIENTE' as AgreementStatus, [Validators.required]],
    resolutionNotes: ['']
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const currentAgr = this.agreement();
      const currentMode = this.mode();

      if (open && currentMode === 'STATUS_UPDATE' && currentAgr) {
        const currentStatus = currentAgr.estado || currentAgr.status || 'PENDIENTE';
        const currentNotes = (currentAgr as any).comentario || currentAgr.resolutionNotes || '';
        this.selectedNewStatus.set(currentStatus);
        this.updateForm.patchValue({
          status: currentStatus,
          resolutionNotes: currentNotes
        });

        // Load audit logs
        this.agreementService.getAuditLogs(currentAgr.id).subscribe((logs: AgreementAuditLog[]) => {
          this.auditLogs.set(logs);
        });

      } else if (open && currentMode === 'CREATE') {
        const sId = this.studentId() || 1;
        const sem = this.semesterNumber() || 3;
        this.createForm.reset({
          title: '',
          description: '',
          responsibleId: sId === 2 ? 102 : 101,
          responsibleName: sId === 2 ? 'Carlos Ramírez Soto' : 'María González López',
          responsibleRole: 'Doctorando',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          semesterNumber: sem
        });
        this.auditLogs.set([]);
      }
    });
  }

  onSelectStatus(status: AgreementStatus): void {
    this.selectedNewStatus.set(status);
    this.updateForm.patchValue({ status });
  }

  onClose(): void {
    this.close.emit();
    this.closed.emit();
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.createForm.value;
    const sId = this.studentId() || 1;

    this.agreementService.createAgreement({
      student: sId,
      studentId: sId,
      semesterNumber: Number(formVal.semesterNumber) || 3,
      descripcion: formVal.description || formVal.title || '',
      title: formVal.title || '',
      description: formVal.description || '',
      responsable: Number(formVal.responsibleId) || 101,
      responsibleId: Number(formVal.responsibleId) || 101,
      fecha_limite: formVal.dueDate || '',
      dueDate: formVal.dueDate || ''
    }).subscribe({
      next: (newAgr) => {
        this.isSubmitting.set(false);
        this.saved.emit(newAgr);
        this.onClose();
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  submitUpdate(): void {
    const agr = this.agreement();
    if (!agr) return;

    this.isSubmitting.set(true);
    const formVal = this.updateForm.value;
    const newStatus = this.selectedNewStatus();

    this.agreementService.updateAgreementStatus(agr.id, {
      estado: newStatus,
      status: newStatus,
      comentario: formVal.resolutionNotes || '',
      resolutionNotes: formVal.resolutionNotes || ''
    } as any).subscribe({
      next: (updatedAgr) => {
        this.isSubmitting.set(false);
        this.saved.emit(updatedAgr);
        this.onClose();
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }
}
