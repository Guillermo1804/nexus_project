import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = this.formBuilder.group({
    first_name: ['', [Validators.required, Validators.maxLength(150)]],
    last_name: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    passwordConfirmation: ['', [Validators.required]],
    matricula: ['', [Validators.required, Validators.maxLength(20)]],
    programa_doctoral: ['Doctorado en Ciencias', [Validators.required]],
    cohorte: ['', [Validators.required, Validators.maxLength(20)]],
  });
  protected isSubmitting = false;
  protected registerError = false;

  submit(): void {
    this.registerError = false;
    if (this.form.invalid || this.form.controls.password.value !== this.form.controls.passwordConfirmation.value) {
      this.form.markAllAsTouched();
      return;
    }

    const { passwordConfirmation: _, ...registration } = this.form.getRawValue();
    this.isSubmitting = true;
    this.auth.register(registration).pipe(
      finalize(() => this.isSubmitting = false),
    ).subscribe({
      next: () => void this.router.navigate(['/home']),
      error: () => this.registerError = true,
    });
  }

  protected passwordsMatch(): boolean {
    return this.form.controls.password.value === this.form.controls.passwordConfirmation.value;
  }
}
