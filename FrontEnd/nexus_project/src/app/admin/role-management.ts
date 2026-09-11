import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthenticatedUser, UserRole } from '../core/auth/auth.models';
import { AuthService } from '../core/auth/auth.service';

const AVAILABLE_ROLES: UserRole[] = [
  'STUDENT',
  'TUTOR',
  'COMMITTEE_MEMBER',
  'PROGRAM_COORDINATOR',
  'ACADEMIC_ADMIN',
  'SYSTEM_ADMIN',
];

@Component({
  selector: 'app-role-management',
  imports: [FormsModule],
  templateUrl: './role-management.html',
  styleUrls: ['./role-management.scss'],
})
export class RoleManagement {
  private readonly auth = inject(AuthService);
  protected readonly roles = AVAILABLE_ROLES;
  protected users: AuthenticatedUser[] = [];
  protected loading = true;
  protected error = '';

  constructor() {
    this.loadUsers();
  }

  assignRole(user: AuthenticatedUser, role: UserRole): void {
    if (user.email === 'admin@nexus.com') return;

    this.error = '';
    this.auth.assignRole(user.id, role).subscribe({
      next: (updatedUser) => {
        this.users = this.users.map((currentUser) => currentUser.id === updatedUser.id ? updatedUser : currentUser);
      },
      error: () => this.error = 'No fue posible actualizar el rol.',
    });
  }

  private loadUsers(): void {
    this.auth.loadUsers().pipe(finalize(() => this.loading = false)).subscribe({
      next: (users) => this.users = users,
      error: () => this.error = 'No fue posible cargar los usuarios.',
    });
  }
}