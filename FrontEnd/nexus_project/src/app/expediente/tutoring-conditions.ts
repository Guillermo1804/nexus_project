import { Component, Input, OnInit, inject} from '@angular/core';
import { RolParticipanteTutoria, StudentOverview } from '../core/academic/academic.models';
import { finalize, forkJoin } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';

interface ParticipanteCondicion {
  participanteId: number | null;
  usuarioId: number;
  nombreCompleto: string;
  rol: RolParticipanteTutoria;
  rolVisible: string;
  asistencia: boolean;
}

@Component({
  selector: 'app-tutoring-conditions',
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
            [disabled]="cargando || guardando || participante.participanteId !== null"
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

      @if (!cargando && !error && !condicionesRegistradas) {
        <button
          type="button"
          [disabled]="guardando"
          (click)="guardarCondiciones()"
        >
          {{ guardando ? 'Guardando...' : 'Guardar asistencia' }}
        </button>
      }
    </section>
  `,
})
export class TutoringConditionsComponent implements OnInit {
  private readonly academicService = inject(AcademicService);
  @Input({ required: true }) tutoriaId!: number;
  @Input({ required: true }) estudiante!: StudentOverview['student'];
  @Input({ required: true }) asesores!: StudentOverview['advisors'];

  protected participantes: ParticipanteCondicion[] = [];
  protected cargando = true;
  protected guardando = false;
  protected error = '';
  protected mensaje = '';
  protected get condicionesRegistradas(): boolean {
    return (
      this.participantes.length > 0 &&
      this.participantes.every(
        participante => participante.participanteId !== null
      )
    );
  }

  ngOnInit(): void {
    this.participantes = [
      {
        participanteId: null,
        usuarioId: this.estudiante.usuario_id,
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

  protected cambiarAsistencia(
    participante: ParticipanteCondicion,
    evento: Event
  ): void {
    const casilla = evento.target as HTMLInputElement;
    participante.asistencia = casilla.checked;
  }
}
