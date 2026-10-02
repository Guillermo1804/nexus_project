import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RolParticipanteTutoria, StudentOverview } from '../core/academic/academic.models';
import { finalize, forkJoin } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { AuthService } from '../core/auth/auth.service';

interface ParticipanteCondicion {
  participanteId: number | null;
  usuarioId: number;
  nombreCompleto: string;
  rol: RolParticipanteTutoria;
  rolVisible: string;
  asistencia: boolean;
}

const localDateString = (): string => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const nextMeetingValidator = (sessionDate: () => string, today: () => string): ValidatorFn => (
  control: AbstractControl,
): ValidationErrors | null => {
  const date = String(control.get('proxima_reunion_fecha')?.value ?? '');

  if (date && date <= today()) return { dateNotFuture: true };
  if (date && date <= sessionDate()) return { dateNotAfterSession: true };
  return null;
};

@Component({
  selector: 'app-tutoring-conditions',
  imports: [ReactiveFormsModule],
  styleUrl: './tutoring-conditions.scss',
  template: `
    <section aria-label="Condiciones de tutoría">
      <div>
        <h4>Condiciones de tutoría</h4>
      </div>

      <p>Asistentes de esta tutoría.</p>

      @for (participante of participantes; track participante.usuarioId) {
        <label>
          <input
            type="checkbox"
            [checked]="participante.asistencia"
            [disabled]="cargando || guardando || participante.participanteId !== null || !auth.hasPermission('tutoring.create')"
            (change)="cambiarAsistencia(participante, $event)"
          />
          <span>{{ participante.nombreCompleto }}</span>
          <small>{{ participante.rolVisible }}</small>
        </label>
      }

      @if (cargando) {
        <p>Consultando condiciones...</p>
      }

      @if (error) {
        <p role="alert">{{ error }}</p>
      }

      @if (mensaje) {
        <p role="status">{{ mensaje }}</p>
      }

      @if (auth.hasPermission('tutoring.create') && !cargando && !error && !condicionesRegistradas) {
        <button
          type="button"
          [disabled]="guardando"
          (click)="guardarCondiciones()"
        >
          {{ guardando ? 'Guardando...' : 'Guardar asistencia' }}
        </button>
      }

      <section class="next-meeting-section" aria-labelledby="next-meeting-title">
        <div>
          <h5 id="next-meeting-title">Próxima reunión</h5>
        </div>
        <p>Programa el seguimiento acordado para esta tutoría. Puedes guardar las notas aunque la fecha siga pendiente.</p>

        <form [formGroup]="nextMeetingForm" (ngSubmit)="guardarProximaReunion()" class="next-meeting-form">
          <div class="next-meeting-field">
            <label for="next-meeting-date">Fecha tentativa (opcional)</label>
            <input
              id="next-meeting-date"
              type="date"
              formControlName="proxima_reunion_fecha"
              [attr.min]="minNextMeetingDate"
              [attr.aria-invalid]="nextMeetingForm.invalid && nextMeetingForm.touched"
              aria-describedby="next-meeting-date-hint next-meeting-date-error"
            />
            <small id="next-meeting-date-hint">Opcional. Si la indicas, debe ser posterior al {{ fechaSesion }}.</small>
            @if (nextMeetingForm.touched && nextMeetingForm.hasError('dateNotFuture')) {
              <span id="next-meeting-date-error" class="field-error" role="alert">
                La fecha tentativa debe ser posterior al día de hoy.
              </span>
            } @else if (nextMeetingForm.touched && nextMeetingForm.hasError('dateNotAfterSession')) {
              <span id="next-meeting-date-error" class="field-error" role="alert">
                La próxima reunión debe ser posterior a la fecha de la tutoría.
              </span>
            }
          </div>

          <div class="next-meeting-field">
            <label for="next-meeting-notes">Notas preparatorias (opcional)</label>
            <textarea
              id="next-meeting-notes"
              rows="3"
              maxlength="500"
              formControlName="proxima_reunion_notas"
              [attr.aria-invalid]="nextMeetingForm.controls.proxima_reunion_notas.invalid && nextMeetingForm.controls.proxima_reunion_notas.touched"
              aria-describedby="next-meeting-counter next-meeting-notes-error"
            ></textarea>
            <small id="next-meeting-counter" class="character-counter" aria-live="polite">
              {{ nextMeetingForm.controls.proxima_reunion_notas.value.length }}/500
            </small>
            @if (nextMeetingForm.controls.proxima_reunion_notas.hasError('maxlength')) {
              <span id="next-meeting-notes-error" class="field-error" role="alert">
                Las notas no pueden superar 500 caracteres.
              </span>
            }
          </div>

          @if (errorProximaReunion) {
            <p role="alert">{{ errorProximaReunion }}</p>
          }
          @if (mensajeProximaReunion) {
            <p role="status">{{ mensajeProximaReunion }}</p>
          }

          @if (auth.hasPermission('tutoring.create')) {
            <div class="next-meeting-actions">
              <button type="submit" [disabled]="guardandoProximaReunion || nextMeetingForm.invalid">
                {{ guardandoProximaReunion ? 'Guardando...' : 'Guardar próxima reunión' }}
              </button>
            </div>
          }
        </form>
      </section>
    </section>
  `,
})
export class TutoringConditionsComponent implements OnInit {
  private readonly academicService = inject(AcademicService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);
  @Input({ required: true }) tutoriaId!: number;
  @Input({ required: true }) estudiante!: StudentOverview['student'];
  @Input({ required: true }) asesores!: StudentOverview['advisors'];
  @Input({ required: true }) fechaSesion = '';
  @Input() proximaReunionFecha: string | null = null;
  @Input() proximaReunionNotas = '';
  @Output() nextMeetingSaved = new EventEmitter<void>();

  protected participantes: ParticipanteCondicion[] = [];
  protected cargando = true;
  protected guardando = false;
  protected error = '';
  protected mensaje = '';
  protected guardandoProximaReunion = false;
  protected errorProximaReunion = '';
  protected mensajeProximaReunion = '';
  protected readonly today = localDateString();
  protected readonly nextMeetingForm = this.fb.nonNullable.group({
    proxima_reunion_fecha: [''],
    proxima_reunion_notas: ['', Validators.maxLength(500)],
  }, { validators: nextMeetingValidator(() => this.fechaSesion, () => this.today) });

  protected get minNextMeetingDate(): string {
    const minimumBase = this.fechaSesion > this.today ? this.fechaSesion : this.today;
    const [year, month, day] = minimumBase.split('-').map(Number);
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
    return nextDay.toISOString().slice(0, 10);
  }

  protected get condicionesRegistradas(): boolean {
    return (
      this.participantes.length > 0 &&
      this.participantes.every(
        participante => participante.participanteId !== null
      )
    );
  }

  ngOnInit(): void {
    this.nextMeetingForm.patchValue({
      proxima_reunion_fecha: this.proximaReunionFecha ?? '',
      proxima_reunion_notas: this.proximaReunionNotas ?? '',
    });

    const estudianteUsuarioId = this.estudiante.user_id;
    this.participantes = estudianteUsuarioId == null ? [] : [
      {
        participanteId: null,
        usuarioId: estudianteUsuarioId,
        nombreCompleto: this.estudiante.nombre_completo,
        rol: 'ESTUDIANTE',
        rolVisible: 'Estudiante',
        asistencia: false,
      },
    ];

    if (this.asesores.advisor) {
      this.participantes.push({
        participanteId: null,
        usuarioId: this.asesores.advisor.id,
        nombreCompleto: this.asesores.advisor.nombre_completo,
        rol: 'ASESOR_PRINCIPAL',
        rolVisible: 'Asesor principal',
        asistencia: false,
      });
    }

    if (this.asesores.coadvisor) {
      this.participantes.push({
        participanteId: null,
        usuarioId: this.asesores.coadvisor.id,
        nombreCompleto: this.asesores.coadvisor.nombre_completo,
        rol: 'COASESOR',
        rolVisible: 'Coasesor',
        asistencia: false,
      });
    }

    for (const miembro of this.asesores.members) {
      this.participantes.push({
        participanteId: null,
        usuarioId: miembro.id,
        nombreCompleto: miembro.nombre_completo,
        rol: 'MIEMBRO_COMITE',
        rolVisible: 'Miembro del comité',
        asistencia: false,
      });
    }
    this.participantes = this.participantes.filter(
      (participante, indice, lista) =>
        indice === lista.findIndex(
          item => item.usuarioId === participante.usuarioId
        )
    );

    this.cargarParticipantes();
  }

  protected cargarParticipantes(): void {
    this.cargando = true;
    this.error = '';

    this.academicService
      .getParticipantesTutoria(this.tutoriaId)
      .pipe(finalize(() => this.cargando = false))
      .subscribe({
        next: registrados => {
          for (const registrado of registrados) {
            const participante = this.participantes.find(
              item => item.usuarioId === registrado.user
            );

            if (participante) {
              participante.participanteId = registrado.id;
              participante.asistencia = registrado.asistencia;
            }
          }
        },
        error: () => {
          this.error = 'No fue posible consultar las condiciones de la tutoría.';
        },
      });
  }

  protected guardarCondiciones(): void {
    if (this.cargando || this.guardando) return;

    const pendientes = this.participantes.filter(
      participante => participante.participanteId === null
    );

    if (pendientes.length === 0) {
      this.mensaje = 'Las condiciones de esta tutoría ya están registradas.';
      return;
    }

    const totalAsistentes = pendientes.filter(
      participante => participante.asistencia
    ).length;

    const confirmado = window.confirm(
      `Ha marcado ${totalAsistentes} de ${pendientes.length} participantes como asistentes. ` +
      'Una vez guardadas, las condiciones no podrán modificarse. ¿Desea continuar?'
    );

    if (!confirmado) return;

    this.guardando = true;
    this.error = '';
    this.mensaje = '';

    const solicitudes = pendientes.map(participante =>
      this.academicService.registrarParticipanteTutoria(
        this.tutoriaId,
        {
          user: participante.usuarioId,
          rol_en_sesion: participante.rol,
          asistencia: participante.asistencia,
        }
      )
    );

    forkJoin(solicitudes)
      .pipe(finalize(() => this.guardando = false))
      .subscribe({
        next: registrados => {
          for (const registrado of registrados) {
            const participante = this.participantes.find(
              item => item.usuarioId === registrado.user
            );

            if (participante) {
              participante.participanteId = registrado.id;
              participante.asistencia = registrado.asistencia;
            }
          }

          this.mensaje = 'Condiciones de tutoría guardadas correctamente.';
        },
        error: err => {
          this.error =
            err.error?.user?.[0] ||
            err.error?.detail ||
            'No fue posible guardar las condiciones de la tutoría.';
        },
      });
  }

  protected guardarProximaReunion(): void {
    if (this.guardandoProximaReunion || !this.auth.hasPermission('tutoring.create')) return;

    if (this.nextMeetingForm.invalid) {
      this.nextMeetingForm.markAllAsTouched();
      return;
    }

    const value = this.nextMeetingForm.getRawValue();
    this.guardandoProximaReunion = true;
    this.errorProximaReunion = '';
    this.mensajeProximaReunion = '';

    this.academicService.updateNextMeeting(this.tutoriaId, {
      proxima_reunion_fecha: value.proxima_reunion_fecha || null,
      proxima_reunion_notas: value.proxima_reunion_notas.trim(),
    }).pipe(finalize(() => this.guardandoProximaReunion = false)).subscribe({
      next: () => {
        this.mensajeProximaReunion = 'Próxima reunión guardada correctamente.';
        this.nextMeetingSaved.emit();
      },
      error: err => {
        this.errorProximaReunion =
          err.error?.proxima_reunion_fecha?.[0] ||
          err.error?.proxima_reunion_notas?.[0] ||
          err.error?.detail ||
          'No fue posible guardar la próxima reunión.';
      },
    });
  }

  protected cambiarAsistencia(
    participante: ParticipanteCondicion,
    evento: Event
  ): void {
    const casilla = evento.target as HTMLInputElement;
    participante.asistencia = casilla.checked;
  }
}
