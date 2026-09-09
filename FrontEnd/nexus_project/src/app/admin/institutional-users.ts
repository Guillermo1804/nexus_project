import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from './admin.service';
import { InstitutionalRole } from './admin.models';

@Component({
  selector: 'app-institutional-users',
  imports: [FormsModule],
  templateUrl: './institutional-users.html',
})
export class InstitutionalUsers {
  private readonly admin = inject(AdminService);
  protected readonly roles: InstitutionalRole[] = ['TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR', 'ACADEMIC_ADMIN'];
  protected form = { first_name: '', last_name: '', email: '', password: '', role: 'TUTOR' as InstitutionalRole };
  protected message = '';
  protected error = '';
  protected saving = false;

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