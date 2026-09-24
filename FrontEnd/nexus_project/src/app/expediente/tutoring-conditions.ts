import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { RolParticipanteTutoria, StudentOverview } from '../core/academic/academic.models';

interface ParticipanteCondicion {
  usuarioId: number;
  nombreCompleto: string;
  rol: RolParticipanteTutoria;
  rolVisible: string;
  asistencia: boolean;
}

@Component({
  selector: 'app-tutoring-conditions',
  template: `
    <section aria-label="Condiciones de tutoría">
      <div>
        <h4>Condiciones de tutoría</h4>
        <button type="button" (click)="cerrado.emit()">Cerrar</button>
      </div>

      <p>Indique quiénes asistieron a esta tutoría.</p>

      @for (participante of participantes; track participante.usuarioId) {
        <label>
          <input
            type="checkbox"
            [checked]="participante.asistencia"
            (change)="cambiarAsistencia(participante, $event)"
          />
          <span>{{ participante.nombreCompleto }}</span>
          <small>{{ participante.rolVisible }}</small>
        </label>
      }
    </section>
  `,
})
export class TutoringConditionsComponent implements OnInit {
  @Input({ required: true }) tutoriaId!: number;
  @Input({ required: true }) estudiante!: StudentOverview['student'];
  @Input({ required: true }) asesores!: StudentOverview['advisors'];
  @Output() cerrado = new EventEmitter<void>();

  protected participantes: ParticipanteCondicion[] = [];

  ngOnInit(): void {
    this.participantes = [
      {
        usuarioId: this.estudiante.usuario_id,
        nombreCompleto: this.estudiante.nombre_completo,
        rol: 'ESTUDIANTE',
        rolVisible: 'Estudiante',
        asistencia: false,
      },
    ];

    if (this.asesores.advisor) {
      this.participantes.push({
        usuarioId: this.asesores.advisor.id,
        nombreCompleto: this.asesores.advisor.nombre_completo,
        rol: 'ASESOR_PRINCIPAL',
        rolVisible: 'Asesor principal',
        asistencia: false,
      });
    }

    if (this.asesores.coadvisor) {
      this.participantes.push({
        usuarioId: this.asesores.coadvisor.id,
        nombreCompleto: this.asesores.coadvisor.nombre_completo,
        rol: 'COASESOR',
        rolVisible: 'Coasesor',
        asistencia: false,
      });
    }

    for (const miembro of this.asesores.members) {
      this.participantes.push({
        usuarioId: miembro.id,
        nombreCompleto: miembro.nombre_completo,
        rol: 'MIEMBRO_COMITE',
        rolVisible: 'Miembro del comité',
        asistencia: false,
      });
    }
  }

  protected cambiarAsistencia(
    participante: ParticipanteCondicion,
    evento: Event
  ): void {
    const casilla = evento.target as HTMLInputElement;
    participante.asistencia = casilla.checked;
  }
}
