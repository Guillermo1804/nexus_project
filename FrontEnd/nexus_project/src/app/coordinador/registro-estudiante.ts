import { Component, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../environments/environment';

const COORDINATOR_API = `${environment.apiUrl}/coordinator`;

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

  protected readonly formulario = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    matricula: ['', Validators.required],
    programa_doctoral: ['', Validators.required],
    fecha_ingreso: ['', Validators.required],
    cohorte: ['', Validators.required],
  });

  registrar(): void {
    
    this.mensajeExito = '';
    this.mensajeError = '';

    if (this.formulario.invalid || this.guardando) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando = true;

    this.http
      .post<EstudianteRegistrado>(
        `${COORDINATOR_API}/students/`,
        this.formulario.getRawValue()
      )
      .pipe(finalize(() => (this.guardando = false)))
      .subscribe({
        next: () => {
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