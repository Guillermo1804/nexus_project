import { Component, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../environments/environment';

const STUDENTS_API = `${environment.apiUrl}/students`;

interface EstudianteRegistrado {
  id: number;
  matricula: string;
  nombre_completo: string;
  programa_doctoral: string;
  cohorte: string;
  estatus_activo: boolean;
}

@Component({
  selector: 'app-registro-estudiante',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro-estudiante.html',
  styleUrl: './registro-estudiante.scss',
})
export class RegistroEstudiante {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  protected guardando = false;
  protected mensajeExito = '';
  protected mensajeError = '';
  protected nuevoEstudianteId: number | null = null;
  protected showPassword = false;

  protected readonly formulario = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)]],
    last_name: ['', [Validators.required, Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    matricula: ['', [Validators.required, Validators.maxLength(20), Validators.pattern(/^[a-zA-Z0-9-]{1,20}$/)]],
    programa_doctoral: ['', Validators.required],
    fecha_ingreso: ['', Validators.required],
    cohorte: ['', Validators.required],
  });

  bloquearNumeros(event: KeyboardEvent): void {
    if (event.key >= '0' && event.key <= '9') {
      event.preventDefault();
    }
  }

  filtrarNumeros(event: Event, controlName: 'first_name' | 'last_name'): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      const sanitized = input.value.replace(/[0-9]/g, '');
      if (input.value !== sanitized) {
        input.value = sanitized;
        this.formulario.get(controlName)?.setValue(sanitized);
      }
    }
  }

  registrar(): void {
    
    this.mensajeExito = '';
    this.mensajeError = '';
    this.nuevoEstudianteId = null;

    if (this.formulario.invalid || this.guardando) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando = true;

    this.http
      .post<EstudianteRegistrado>(
        `${STUDENTS_API}/`,
        { ...this.formulario.getRawValue(), matricula: this.formulario.controls.matricula.value.trim().toUpperCase() }
      )
      .pipe(finalize(() => (this.guardando = false)))
      .subscribe({
        next: (estudiante) => {
          this.nuevoEstudianteId = estudiante.id;
          this.mensajeExito = 'Estudiante registrado correctamente.';
          this.formulario.reset();
        },
        error: (error: HttpErrorResponse) => {
          if (error.error?.matricula) {
            this.mensajeError = error.error.matricula[0];
          } else if (error.error?.email) {
            this.mensajeError = error.error.email[0];
          } else if (error.error?.password) {
            this.mensajeError = error.error.password[0];
          } else {
            this.mensajeError = 'No fue posible registrar al estudiante.';
          }
        },
      });
  }
}