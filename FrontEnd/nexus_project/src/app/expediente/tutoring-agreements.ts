import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { Agreement, TutoringSession } from '../core/academic/academic.models';
import { AuthService } from '../core/auth/auth.service';

/** Candidato a responsable: usuario asociado al seguimiento del estudiante (HU-12). */
export interface ResponsibleOption {
  id: number;
  nombre_completo: string;
  etiqueta: string;
}

/** HU-11 + HU-12: crear acuerdos con descripción, responsable y fecha límite. */
@Component({
  selector: 'app-tutoring-agreements',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tutoring-agreements.html',
  styleUrl: './tutoring-agreements.scss',
})
export class TutoringAgreementsComponent implements OnChanges {
  @Input({ required: true }) studentId!: number;
  @Input() preferredSessionId: number | null = null;
  @Input() responsibleOptions: ResponsibleOption[] = [];
  @Output() changed = new EventEmitter<void>();

  private readonly academic = inject(AcademicService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected sessions: TutoringSession[] = [];
  protected selectedSessionId: number | null = null;
  protected agreements: Agreement[] = [];
  protected cargando = false;
  protected guardando = false;
  protected actualizandoId: number | null = null;
  protected error = '';
  protected exito = '';

  protected readonly form = this.fb.nonNullable.group({
    descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    responsable: [0 as number, [Validators.required, Validators.min(1)]],
    fecha_limite: ['', [Validators.required]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['studentId'] || changes['preferredSessionId']) {
      this.cargarSesiones();
    }
    if (changes['responsibleOptions']) {
      this.ensureDefaultResponsable();
    }
  }

  protected puedeRegistrar(): boolean {
    return this.auth.hasPermission('tutoring.create');
  }

  /** HU-13: solo el responsable puede avanzar el estado. */
  protected puedeActualizarEstado(agreement: Pick<Agreement, 'responsable' | 'estado' | 'is_vencido'>): boolean {
    if (agreement.is_vencido) return false;
    const userId = this.auth.user()?.id;
    if (!userId || agreement.responsable !== userId) return false;
    return this.siguienteEstado(agreement.estado) != null;
  }

  protected etiquetaEstado(estado: string, isVencido = false): string {
    if (isVencido && estado !== 'CONCLUIDO') return 'VENCIDO';
    return estado.replaceAll('_', ' ');
  }

  protected etiquetaSiguiente(estado: string): string {
    const next = this.siguienteEstado(estado);
    return next ? `Pasar a ${this.etiquetaEstado(next)}` : '';
  }

  protected actualizarEstado(agreement: Agreement): void {
    const next = this.siguienteEstado(agreement.estado);
    if (!next || !this.puedeActualizarEstado(agreement) || this.actualizandoId != null) return;

    this.actualizandoId = agreement.id;
    this.error = '';
    this.exito = '';
    this.academic
      .updateAgreementStatus(agreement.id, next)
      .pipe(finalize(() => (this.actualizandoId = null)))
      .subscribe({
        next: () => {
          this.exito = `Estado actualizado a ${this.etiquetaEstado(next)}.`;
          this.cargarAcuerdos();
          this.changed.emit();
        },
        error: (err) => {
          this.error =
            err.error?.estado?.[0] ||
            err.error?.detail ||
            'No fue posible actualizar el estado del acuerdo.';
        },
      });
  }

  private siguienteEstado(estado: string): 'EN_PROCESO' | 'CONCLUIDO' | null {
    if (estado === 'PENDIENTE') return 'EN_PROCESO';
    if (estado === 'EN_PROCESO') return 'CONCLUIDO';
    return null;
  }

  protected minFechaLimite(): string {
    const session = this.sessions.find((s) => s.id === this.selectedSessionId);
    return session?.fecha_sesion ?? '';
  }

  protected onSessionChange(raw: string): void {
    const id = Number(raw);
    this.selectedSessionId = Number.isInteger(id) && id > 0 ? id : null;
    this.exito = '';
    this.error = '';
    this.syncFechaMinima();
    this.cargarAcuerdos();
  }

  protected submit(): void {
    if (!this.selectedSessionId || this.form.invalid || this.guardando) {
      this.form.markAllAsTouched();
      return;
    }

    const fecha = this.form.controls.fecha_limite.value;
    const min = this.minFechaLimite();
    if (min && fecha < min) {
      this.error = 'La fecha límite no puede ser anterior a la tutoría.';
      return;
    }

    this.guardando = true;
    this.error = '';
    this.exito = '';
    this.academic
      .createSessionAgreement(this.selectedSessionId, {
        descripcion: this.form.controls.descripcion.value.trim(),
        responsable: this.form.controls.responsable.value,
        fecha_limite: fecha,
      })
      .pipe(finalize(() => (this.guardando = false)))
      .subscribe({
        next: () => {
          const responsable = this.form.controls.responsable.value;
          this.form.reset({
            descripcion: '',
            responsable,
            fecha_limite: this.defaultFechaLimite(),
          });
          this.exito = 'Acuerdo registrado correctamente.';
          this.cargarAcuerdos();
          this.changed.emit();
        },
        error: (err) => {
          this.error =
            err.error?.descripcion?.[0] ||
            err.error?.responsable?.[0] ||
            err.error?.fecha_limite?.[0] ||
            err.error?.detail ||
            'No fue posible registrar el acuerdo.';
        },
      });
  }

  private defaultFechaLimite(): string {
    const min = this.minFechaLimite();
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const candidate = d.toISOString().slice(0, 10);
    return min && candidate < min ? min : candidate;
  }

  private ensureDefaultResponsable(): void {
    const current = this.form.controls.responsable.value;
    const options = this.responsibleOptions;
    if (!options.length) return;
    if (current && options.some((o) => o.id === current)) return;
    const me = this.auth.user()?.id;
    const preferred = (me && options.find((o) => o.id === me)) || options[0];
    this.form.controls.responsable.setValue(preferred.id);
  }

  private syncFechaMinima(): void {
    const current = this.form.controls.fecha_limite.value;
    const next = this.defaultFechaLimite();
    if (!current || (this.minFechaLimite() && current < this.minFechaLimite())) {
      this.form.controls.fecha_limite.setValue(next);
    }
  }

  private cargarSesiones(): void {
    if (!this.studentId) return;
    this.cargando = true;
    this.error = '';
    this.academic
      .getTutoringSessions(1)
      .pipe(finalize(() => (this.cargando = false)))
      .subscribe({
        next: (data) => {
          this.sessions = data.results
            .filter((s) => s.student === this.studentId)
            .sort((a, b) => b.fecha_sesion.localeCompare(a.fecha_sesion) || b.id - a.id);
          const preferred = this.preferredSessionId;
          const exists = preferred != null && this.sessions.some((s) => s.id === preferred);
          this.selectedSessionId = exists ? preferred : this.sessions[0]?.id ?? null;
          this.ensureDefaultResponsable();
          this.syncFechaMinima();
          this.cargarAcuerdos();
        },
        error: () => {
          this.sessions = [];
          this.agreements = [];
          this.error = 'No fue posible cargar las tutorías para acuerdos.';
        },
      });
  }

  private cargarAcuerdos(): void {
    if (!this.selectedSessionId) {
      this.agreements = [];
      return;
    }
    this.academic.getSessionAgreements(this.selectedSessionId).subscribe({
      next: (items) => (this.agreements = items),
      error: () => {
        this.agreements = [];
        this.error = 'No fue posible cargar los acuerdos de la tutoría.';
      },
    });
  }
}
