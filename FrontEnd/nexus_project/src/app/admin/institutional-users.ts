import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from './admin.service';
import { InstitutionalRole } from './admin.models';

@Component({
  selector: 'app-institutional-users',
  imports: [FormsModule],
  templateUrl: './institutional-users.html',
  styles: [`
    .password-field-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .password-field-wrapper input {
      width: 100%;
      padding-right: 36px;
    }
    .btn-toggle-password {
      position: absolute;
      right: 6px;
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #667085;
      padding: 4px;
    }
  `],
})
export class InstitutionalUsers {
  private readonly admin = inject(AdminService);
  protected readonly roles: InstitutionalRole[] = ['TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR', 'ACADEMIC_ADMIN'];
  protected form = { first_name: '', last_name: '', email: '', password: '', role: 'TUTOR' as InstitutionalRole };
  protected message = '';
  protected error = '';
  protected saving = false;
  protected showPassword = false;

  createUser(): void {
    this.message = '';
    this.error = '';
    this.saving = true;
    this.admin.createInstitutionalUser(this.form).subscribe({
      next: (user) => {
        this.message = `Cuenta creada para ${user.email}.`;
        this.form = { first_name: '', last_name: '', email: '', password: '', role: 'TUTOR' };
        this.saving = false;
      },
      error: () => {
        this.error = 'No fue posible crear la cuenta. Verifica los datos e inténtalo nuevamente.';
        this.saving = false;
      },
    });
  }
}