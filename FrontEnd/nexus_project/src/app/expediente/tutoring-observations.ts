import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { TutoringObservation, TutoringSession } from '../core/academic/academic.models';
import { AuthService } from '../core/auth/auth.service';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-tutoring-observations',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tutoring-observations.html',
  styleUrl: './tutoring-observations.scss',
})
export class TutoringObservationsComponent implements OnChanges {
  @Input({ required: true }) studentId!: number;
  @Input() preferredSessionId: number | null = null;

  private readonly academic = inject(AcademicService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);

  protected sessions: TutoringSession[] = [];
  /** Sesiones futuras que existen pero todavía no admiten observaciones. */
  protected futureSessions = 0;
  protected selectedSessionId: number | null = null;
  protected observations: TutoringObservation[] = [];
  protected cargandoSesiones = false;
  protected cargandoObservaciones = false;
  protected guardando = false;
  protected error = '';
  protected exito = '';

  protected readonly form = this.fb.nonNullable.group({
    tema_revisado: ['', [Validators.required, Validators.maxLength(255)]],
    observaciones_detalladas: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['studentId'] || changes['preferredSessionId']) {
      this.cargarSesiones();
    }
  }

  protected onSessionChange(raw: string): void {
    const id = Number(raw);
    this.selectedSessionId = Number.isInteger(id) && id > 0 ? id : null;
    this.exito = '';
    this.error = '';
    this.cargarObservaciones();
  }

  protected puedeRegistrar(): boolean {
    return this.auth.hasPermission('tutoring.create');
  }

  protected submit(): void {
    if (!this.selectedSessionId || this.form.invalid || this.guardando) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando = true;
    this.error = '';
    this.exito = '';
    const payload = this.form.getRawValue();
    this.academic
      .createSessionObservation(this.selectedSessionId, payload)
      .pipe(finalize(() => (this.guardando = false)))
      .subscribe({
        next: () => {
          this.form.reset({ tema_revisado: '', observaciones_detalladas: '' });
          this.exito = 'Observación registrada correctamente.';
          this.toasts.exito('Observación añadida a la bitácora de la tutoría.');
          this.cargarObservaciones();
        },
        error: (err) => {
          this.error =
            err.error?.detail ||
            err.error?.observaciones_detalladas?.[0] ||
            err.error?.tema_revisado?.[0] ||
            (err.status === 403
              ? 'No tiene permiso para registrar observaciones en esta tutoría.'
              : 'No fue posible registrar la observación.');
        },
      });
  }

  private cargarSesiones(): void {
    if (!this.studentId) return;
    this.cargandoSesiones = true;
    this.error = '';
    this.academic
      .getTutoringSessions(1)
      .pipe(finalize(() => (this.cargandoSesiones = false)))
      .subscribe({
        next: (data) => {
          // Una tutoría programada para después no admite comentarios: no ocurrió.
          const today = new Date().toISOString().slice(0, 10);
          const propias = data.results.filter((s) => s.student === this.studentId);
          const pasadas = propias.filter((s) => s.fecha_sesion <= today);
          this.futureSessions = propias.length - pasadas.length;
          this.sessions = [...pasadas].sort((a, b) => b.fecha_sesion.localeCompare(a.fecha_sesion) || b.id - a.id);
          const preferred = this.preferredSessionId;
          const exists = preferred != null && this.sessions.some((s) => s.id === preferred);
          this.selectedSessionId = exists ? preferred : this.sessions[0]?.id ?? null;
          this.cargarObservaciones();
        },
        error: () => {
          this.sessions = [];
          this.futureSessions = 0;
          this.selectedSessionId = null;
          this.observations = [];
          this.error = 'No fue posible cargar las tutorías del estudiante.';
        },
      });
  }

  private cargarObservaciones(): void {
    if (!this.selectedSessionId) {
      this.observations = [];
      return;
    }
    this.cargandoObservaciones = true;
    this.academic
      .getSessionObservations(this.selectedSessionId)
      .pipe(finalize(() => (this.cargandoObservaciones = false)))
      .subscribe({
        next: (items) => {
          this.observations = [...items].sort((a, b) => a.created_at.localeCompare(b.created_at));
        },
        error: () => {
          this.observations = [];
          this.error = 'No fue posible cargar las observaciones de la tutoría.';
        },
      });
  }
}
