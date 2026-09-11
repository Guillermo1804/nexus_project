import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from './admin.service';
import { InstitutionalRole } from './admin.models';

const FALLBACK_CREATE_ERROR = 'No fue posible crear la cuenta. Verifica los datos e inténtalo nuevamente.';

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
      error: (error: HttpErrorResponse) => {
        this.error = this.messageFromApiError(error);
        this.saving = false;
      },
    });
  }

  private messageFromApiError(error: HttpErrorResponse): string {
    const payload = error.error;
    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }
    if (payload && typeof payload === 'object') {
      if (typeof payload.detail === 'string' && payload.detail.trim()) {
        return payload.detail;
      }
      for (const value of Object.values(payload)) {
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
        if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
          return value[0];
        }
      }
    }
    return FALLBACK_CREATE_ERROR;
  }
}