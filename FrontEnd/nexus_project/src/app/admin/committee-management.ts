import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, finalize } from 'rxjs';
import { AdminService } from './admin.service';
import { AdminStudent, CommitteeAssignment } from './admin.models';
import { AuthenticatedUser } from '../core/auth/auth.models';

@Component({
  selector: 'app-committee-management',
  imports: [FormsModule],
  templateUrl: './committee-management.html',
  styleUrls: ['./committee-management.scss'],
})
export class CommitteeManagement {
  private readonly admin = inject(AdminService);
  protected assignments: CommitteeAssignment[] = [];
  protected users: AuthenticatedUser[] = [];
  protected students: AdminStudent[] = [];
  protected form = { user: null as number | null, student: null as number | null, rol_comite: 'ASESOR_PRINCIPAL' as CommitteeAssignment['rol_comite'] };
  protected loading = true;
  protected error = '';

  constructor() {
    this.loadData();
  }

  createAssignment(): void {
    this.error = '';
    if (this.form.user === null || this.form.student === null) {
      this.error = 'Selecciona una cuenta y un estudiante.';
      return;
    }
    this.admin.createCommitteeAssignment({ ...this.form, user: this.form.user, student: this.form.student }).subscribe({
      next: (assignment) => this.assignments = [...this.assignments, assignment],
      error: () => this.error = 'No fue posible crear la asociación. Verifica los identificadores y el rol de la cuenta.',
    });
  }

  toggle(assignment: CommitteeAssignment): void {
    this.admin.setCommitteeAssignmentStatus(assignment.id, !assignment.is_active).subscribe({
      next: (updated) => this.assignments = this.assignments.map((item) => item.id === updated.id ? updated : item),
      error: () => this.error = 'No fue posible actualizar el estado de la asociación.',
    });
  }

  private loadData(): void {
    forkJoin({
      assignments: this.admin.getCommitteeAssignments(),
      users: this.admin.getUsers(),
      students: this.admin.getStudents(),
    }).pipe(finalize(() => this.loading = false)).subscribe({
      next: ({ assignments, users, students }) => {
        this.assignments = assignments;
        this.users = users.filter((user) => user.role === 'TUTOR' || user.role === 'COMMITTEE_MEMBER');
        this.students = students;
      },
      error: () => this.error = 'No fue posible cargar cuentas, estudiantes y asociaciones.',
    });
  }
}