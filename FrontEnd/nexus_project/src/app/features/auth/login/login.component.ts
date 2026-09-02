import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  });

  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal<boolean>(false);

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: (res) => {
        this.loading.set(false);
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        const role = res.user?.role;
        const studentId = res.user?.student_id || this.authService.getStudentId();

        if (returnUrl && (!returnUrl.includes('/dashboard') || role !== 'ESTUDIANTE')) {
          this.router.navigateByUrl(returnUrl);
        } else {
          if (role === 'ESTUDIANTE') {
            this.router.navigate(['/students', studentId || 'me']);
          } else if (role === 'ADMIN' || role === 'COORDINADOR') {
            this.router.navigate(['/dashboard']);
          } else {
            this.router.navigate(['/students']);
          }
        }
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Credenciales inválidas. Verifique su correo y contraseña.');
        } else if (err.error?.detail) {
          this.errorMessage.set(err.error.detail);
        } else if (err.error?.non_field_errors) {
          this.errorMessage.set(err.error.non_field_errors.join(' '));
        } else {
          this.errorMessage.set('Error al comunicarse con el servidor. Intente nuevamente.');
        }
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(val => !val);
  }

  get isEmailInvalid(): boolean {
    const control = this.loginForm.get('email');
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get isPasswordInvalid(): boolean {
    const control = this.loginForm.get('password');
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
