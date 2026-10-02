import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, finalize } from 'rxjs';
import { AdminService } from './admin.service';
import { AcademicCommittee, AdminStudent, COMMITTEE_ROLE_LABELS, CommitteeMembership, CommitteeRole } from './admin.models';
import { AuthenticatedUser, ROLE_LABELS, UserRole } from '../core/auth/auth.models';
import { ConfirmDialogComponent, ConfirmRequest } from '../shared/confirm-dialog.component';

@Component({
  selector: 'app-committee-management',
  imports: [FormsModule, ConfirmDialogComponent],
  templateUrl: './committee-management.html',
  styleUrls: ['./committee-management.scss'],
})
export class CommitteeManagement {
  private readonly admin = inject(AdminService);
  protected committees: AcademicCommittee[] = [];
  protected users: AuthenticatedUser[] = [];
  protected students: AdminStudent[] = [];
  protected form = { user: null as number | null, student: null as number | null, role: 'ASESOR' as CommitteeRole };
  protected loading = true;
  protected error = '';
  /** Borrado en espera de confirmación; `null` cuando no hay nada pendiente. */
  protected pendingRemoval: { membership: CommitteeMembership; request: ConfirmRequest } | null = null;

  constructor() { this.loadData(); }

  getRoleLabel(role: string): string { return ROLE_LABELS[role as UserRole] || role; }
  getCommitteeRoleLabel(role: CommitteeRole): string { return COMMITTEE_ROLE_LABELS[role]; }
  compatibleUsers(): AuthenticatedUser[] {
    const role = this.form.role === 'COMMITTEE_MEMBER' ? 'COMMITTEE_MEMBER' : 'TUTOR';
    return this.users.filter(user => user.role === role);
  }

  createAssignment(): void {
    this.error = '';
    if (this.form.user === null || this.form.student === null) {
      this.error = 'Selecciona una cuenta y un estudiante.';
      return;
    }
    this.admin.createCommittee(this.form.student, this.form.user, this.form.role).subscribe({
      next: (committee) => this.committees = [...this.committees.filter(item => item.id !== committee.id), committee],
      error: (response) => this.error = response.error?.memberships?.[0]?.user?.[0] || response.error?.non_field_errors?.[0] || 'No fue posible asignar la membresía.',
    });
  }

/**
   * Un clic en «Eliminar» no borra: abre la confirmación. El borrado real ocurre
   * únicamente en `confirmRemove()`, y se puede abandonar con Escape o «Cancelar».
   */
  remove(membership: CommitteeMembership, studentName = ''): void {
    this.error = '';
    this.pendingRemoval = {
      membership,
      request: {
        title: 'Quitar del comité',
        message: `Se quitará a ${membership.user_email} del comité de ${studentName || 'este estudiante'}.`,
        warning: 'Perderá el acceso al expediente y a los acuerdos asociados. Esta acción no se puede deshacer.',
        confirmLabel: 'Quitar del comité',
      },
    };
  }

  protected confirmRemove(): void {
    const pending = this.pendingRemoval;
    this.pendingRemoval = null;
    if (!pending) return;
    const { membership } = pending;
    this.admin.deleteCommitteeMembership(membership.id).subscribe({
      next: () => this.committees = this.committees.map(committee => ({
        ...committee, memberships: committee.memberships.filter(item => item.id !== membership.id),
      })),
      error: () => this.error = 'No fue posible eliminar la membresía.',
    });
  }

  protected cancelRemove(): void { this.pendingRemoval = null; }

  private loadData(): void {
    forkJoin({ committees: this.admin.getCommittees(), users: this.admin.getUsers(), students: this.admin.getStudents() })
      .pipe(finalize(() => this.loading = false)).subscribe({
        next: ({ committees, users, students }) => { this.committees = committees.results; this.users = users.results; this.students = students.results; },
        error: () => this.error = 'No fue posible cargar cuentas, estudiantes y comités.',
      });
  }
}
