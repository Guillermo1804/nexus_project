import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  input,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommitteeService } from '../../../core/services/committee.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  AcademicCommitteeMember,
  CommitteeRole,
  CommitteeAssignRequest
} from '../../../core/models/committee.model';
import { User } from '../../../core/models/user.model';
import { PillBadgeComponent } from '../../../shared/components/pill-badge/pill-badge.component';

@Component({
  selector: 'app-academic-committee',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PillBadgeComponent],
  templateUrl: './academic-committee.component.html',
  styleUrls: ['./academic-committee.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AcademicCommitteeComponent implements OnInit {
  private committeeService = inject(CommitteeService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  // Inputs
  readonly studentId = input.required<number | string>();
  readonly isReadOnly = input<boolean>(false);

  // Signals
  readonly members = signal<AcademicCommitteeMember[]>([]);
  readonly availableAdvisors = signal<User[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly showAssignModal = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

  // User permission check
  readonly isCoordinator = computed(() => {
    const user = this.authService.currentUser();
    return user?.role === 'COORDINADOR' || user?.isStaff === true || user?.is_staff === true;
  });

  // Assign Form
  readonly assignForm = this.fb.group({
    userId: [null as number | null, [Validators.required]],
    rolComite: ['ASESOR_PRINCIPAL' as CommitteeRole, [Validators.required]],
    fechaAsignacion: [new Date().toISOString().split('T')[0], [Validators.required]]
  });

  readonly roleOptions: { value: CommitteeRole; label: string; badgeType: 'ACTIVO' | 'INFO' | 'PENDIENTE' | 'DEFAULT' }[] = [
    { value: 'ASESOR_PRINCIPAL', label: 'Asesor Principal / Director', badgeType: 'ACTIVO' },
    { value: 'COASESOR', label: 'Coasesor', badgeType: 'INFO' },
    { value: 'VOCAL', label: 'Vocal', badgeType: 'INFO' },
    { value: 'SECRETARIO', label: 'Secretario', badgeType: 'PENDIENTE' },
  ];

  ngOnInit(): void {
    this.loadCommittee();
    this.loadAvailableAdvisors();
  }

  loadAvailableAdvisors(): void {
    this.committeeService.getAvailableAdvisors().subscribe({
      next: (advisors) => {
        this.availableAdvisors.set(advisors);
      },
      error: () => {
        // Fallback or silence if offline
      }
    });
  }

  loadCommittee(): void {
    const id = Number(this.studentId());
    if (!id) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.committeeService.getCommittee(id).subscribe({
      next: (data) => {
        this.members.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('No se pudo cargar el comité tutorial.');
        this.isLoading.set(false);
      }
    });
  }

  openAssignModal(): void {
    this.loadAvailableAdvisors();
    this.assignForm.reset({
      userId: null,
      rolComite: 'ASESOR_PRINCIPAL',
      fechaAsignacion: new Date().toISOString().split('T')[0]
    });
    this.showAssignModal.set(true);
    this.errorMessage.set(null);
  }


  closeAssignModal(): void {
    this.showAssignModal.set(false);
  }

  submitAssignMember(): void {
    if (this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }

    const formVal = this.assignForm.value;
    const studentIdNum = Number(this.studentId());

    const payload: CommitteeAssignRequest = {
      student: studentIdNum,
      user: Number(formVal.userId),
      rol_comite: formVal.rolComite as CommitteeRole,
      fecha_asignacion: formVal.fechaAsignacion || undefined
    };

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.committeeService.assignMember(studentIdNum, payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.closeAssignModal();
        this.successMessage.set('Miembro asignado exitosamente al comité.');
        this.loadCommittee();
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const detail = err?.error?.non_field_errors?.[0] ||
                       err?.error?.user?.[0] ||
                       err?.error?.detail ||
                       'Error al asignar miembro al comité.';
        this.errorMessage.set(detail);
      }
    });
  }

  removeMember(memberId: number): void {
    if (!confirm('¿Está seguro de remover a este miembro del comité académico?')) {
      return;
    }

    const studentIdNum = Number(this.studentId());
    this.isLoading.set(true);

    this.committeeService.removeMember(studentIdNum, memberId).subscribe({
      next: () => {
        this.successMessage.set('Miembro removido correctamente.');
        this.loadCommittee();
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al remover miembro del comité.');
      }
    });
  }

  getRoleLabel(role: CommitteeRole): string {
    const found = this.roleOptions.find(r => r.value === role);
    return found ? found.label : role;
  }

  getRoleBadgeType(role: CommitteeRole): 'ACTIVO' | 'INFO' | 'PENDIENTE' {
    const found = this.roleOptions.find(r => r.value === role);
    return found ? (found.badgeType as 'ACTIVO' | 'INFO' | 'PENDIENTE') : 'INFO';
  }

  getInitials(name?: string): string {
    if (!name) return 'AC';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
}
