import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { StudentOverview, Semester } from '../core/academic/academic.models';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-student-overview',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './student-overview.html',
  styleUrl: './student-overview.scss',
})
export class StudentOverviewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly academicService = inject(AcademicService);
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected studentId = 0;
  protected overview: StudentOverview | null = null;
  protected cargando = true;
  protected error = '';

  protected guardandoSemestre = false;
  protected errorSemestre = '';
  protected mostrarFormSemestre = false;

  protected readonly semForm = this.fb.nonNullable.group({
    numero: [1, [Validators.required, Validators.min(1), Validators.max(6)]],
    fecha_inicio: ['', Validators.required],
    fecha_fin: ['', Validators.required],
    is_active: [true],
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.studentId = Number(idParam);
      this.cargarExpediente();
    } else {
      this.error = 'Identificador de estudiante inválido.';
      this.cargando = false;
    }
  }

  cargarExpediente(): void {
    this.cargando = true;
    this.error = '';
    this.academicService
      .getStudentOverview(this.studentId)
      .pipe(finalize(() => (this.cargando = false)))
      .subscribe({
        next: (data) => {
          this.overview = data;
        },
        error: (err) => {
          if (err.status === 404) {
            this.error = 'El expediente solicitado no existe o no tiene permisos para consultarlo.';
          } else if (err.status === 401 || err.status === 403) {
            this.error = 'No cuenta con autorización para consultar este expediente.';
          } else {
            this.error = 'Error al cargar el expediente del estudiante.';
          }
        },
      });
  }

  registrarSemestre(): void {
    if (this.semForm.invalid || this.guardandoSemestre) {
      this.semForm.markAllAsTouched();
      return;
    }
    this.guardandoSemestre = true;
    this.errorSemestre = '';
    this.academicService
      .createSemester(this.studentId, this.semForm.getRawValue())
      .pipe(finalize(() => (this.guardandoSemestre = false)))
      .subscribe({
        next: () => {
          this.mostrarFormSemestre = false;
          this.semForm.reset({ numero: 1, fecha_inicio: '', fecha_fin: '', is_active: true });
          this.cargarExpediente();
        },
        error: (err) => {
          this.errorSemestre = err.error?.numero || err.error?.fecha_fin || 'No fue posible registrar el semestre.';
        },
      });
  }
}
