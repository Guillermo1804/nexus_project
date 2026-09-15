import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthenticatedUser, ROLE_LABELS, UserRole } from '../core/auth/auth.models';
import { AuthService } from '../core/auth/auth.service';

const AVAILABLE_ROLES: UserRole[] = [
  'STUDENT',
  'TUTOR',
  'COMMITTEE_MEMBER',
  'PROGRAM_COORDINATOR',
];

@Component({
  selector: 'app-role-management',
  imports: [FormsModule, RouterLink],
  templateUrl: './role-management.html',
  styleUrls: ['./role-management.scss'],
})
export class RoleManagement {
  private readonly auth = inject(AuthService);
  protected readonly roles = AVAILABLE_ROLES;
  protected users: AuthenticatedUser[] = [];
  protected loading = true;
  protected error = '';
  protected readonly updatingUserIds = new Set<number>();

  constructor() {
    this.loadUsers();
  }

  getRoleLabel(role: string): string {
    return ROLE_LABELS[role as UserRole] || role;
  }

  getAvailableRolesForUser(user: AuthenticatedUser): UserRole[] {
    if (user.role === 'STUDENT') {
      return this.roles;
    }
    return this.roles.filter((r) => r !== 'STUDENT');
  }

  assignRole(user: AuthenticatedUser, role: UserRole): void {
    if (
      user.role === 'SYSTEM_ADMIN' ||
      role === 'SYSTEM_ADMIN' ||
      (role === 'STUDENT' && user.role !== 'STUDENT') ||
      role === user.role ||
      this.updatingUserIds.has(user.id)
    ) {
      return;
    }

    this.error = '';
    this.updatingUserIds.add(user.id);
    this.auth.assignRole(user.id, role).pipe(
      finalize(() => this.updatingUserIds.delete(user.id)),
    ).subscribe({
      next: (updatedUser) => {
        this.users = this.users.map((currentUser) => currentUser.id === updatedUser.id ? updatedUser : currentUser);
        this.error = '';
      },
      error: () => this.error = 'No fue posible actualizar el rol.',
    });
  }

  private loadUsers(): void {
    this.auth.loadUsers().pipe(finalize(() => this.loading = false)).subscribe({
      next: (response) => this.users = response.results,
      error: () => this.error = 'No fue posible cargar los usuarios.',
    });
  }
}