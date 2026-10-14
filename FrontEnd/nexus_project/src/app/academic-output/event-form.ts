import { Component, computed, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { AcademicEvent, EventType, RoleParticipation, Modality } from '../core/academic/academic.models';
import { ToastService } from '../shared/toast.service';

const EVIDENCE_REQUIRED_ROLES = new Set<RoleParticipation>(['PONENTE']);

@Component({
  selector: 'app-event-form',
  imports: [ReactiveFormsModule],
  templateUrl: './event-form.html',
  styleUrl: './event-form.scss',
})
export class EventFormComponent {
  protected readonly fb = inject(FormBuilder);
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly service = inject(AcademicService);
  protected readonly toast = inject(ToastService);

  protected readonly studentId = this.route.snapshot.paramMap.get('id');
  protected readonly eventId = this.route.snapshot.paramMap.get('eventId');
  protected readonly isEditMode = computed(() => this.eventId !== null);

  protected readonly form = this.fb.nonNullable.group({
    titulo_trabajo: ['', Validators.required],
    nombre_evento: ['', Validators.required],
    tipo_evento: ['', Validators.required],
    modalidad: ['PRESENCIAL', Validators.required],
    rol_participacion: ['PONENTE', Validators.required],
    fecha_evento: ['', Validators.required],
    lugar: [''],
    evidencia: [null as number | null],
  }, { validators: this.evidenceOrDoiValidator() });

  protected saving = false;
  protected selectedFile: File | null = null;
  protected uploadedEvidenceId: number | null = null;

  protected readonly eventTypes: { value: EventType; label: string }[] = [
    { value: 'CONGRESO', label: 'Congreso' },
    { value: 'COLOQUIO', label: 'Coloquio' },
    { value: 'SIMPOSIO', label: 'Simposio' },
  ];

  protected readonly roles: { value: RoleParticipation; label: string }[] = [
    { value: 'PONENTE', label: 'Ponente' },
    { value: 'CONFERENCISTA_MAGISTRAL', label: 'Conferencista Magistral' },
    { value: 'ASISTENTE', label: 'Asistente' },
  ];

  protected readonly modalities: { value: Modality; label: string }[] = [
    { value: 'PRESENCIAL', label: 'Presencial' },
    { value: 'VIRTUAL', label: 'Virtual' },
    { value: 'HIBRIDA', label: 'Híbrida' },
  ];

  protected readonly maxDate = new Date().toISOString().split('T')[0];

  private evidenceOrDoiValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const rol = control.get('rol_participacion')?.value;
      const evidencia = control.get('evidencia')?.value;
      // Aceptamos tanto el ID de evidencia ya subida como el archivo seleccionado
      const hasEvidence = !!evidencia || !!this.selectedFile || !!this.uploadedEvidenceId;
      if (EVIDENCE_REQUIRED_ROLES.has(rol) && !hasEvidence) {
        return { evidenceRequired: 'Debe adjuntar constancia para ponentes.' };
      }
      return null;
    };
  }

  constructor() {
    this.form.controls.rol_participacion.valueChanges.subscribe(() => {
      this.form.updateValueAndValidity({ onlySelf: false, emitEvent: false });
    });

    if (this.eventId) {
      this.loadEvent();
    }
  }

  protected onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  protected async submit(): Promise<void> {
    let evidenciaId: number | null = null;
    if (this.selectedFile && this.studentId) {
      try {
        const overview = await firstValueFrom(this.service.getStudentOverview(Number(this.studentId)));
        const semesterId = overview.current_semester?.id ?? overview.semesters[0]?.id ?? null;
        const evidence = await firstValueFrom(this.service.uploadEventEvidence(Number(this.studentId), semesterId, this.selectedFile));
        evidenciaId = evidence.id;
        this.uploadedEvidenceId = evidenciaId;
        // Actualizar el campo del formulario ANTES de validar
        this.form.controls.evidencia.setValue(evidenciaId);
        this.form.updateValueAndValidity();
      } catch (err) {
        this.toast.error('Error al subir la evidencia');
        console.error(err);
        return;
      }
    } else if (this.uploadedEvidenceId) {
      // Si ya teníamos evidencia subida (modo edición), asegurar que esté en el form
      this.form.controls.evidencia.setValue(this.uploadedEvidenceId);
      this.form.updateValueAndValidity();
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;

    const payload = this.form.getRawValue() as Partial<AcademicEvent>;

    const request = this.eventId
      ? this.service.updateEvent(Number(this.eventId), payload)
      : this.service.createEvent(Number(this.studentId), payload);

    request.pipe(finalize(() => this.saving = false)).subscribe({
      next: () => {
        this.toast.exito(this.eventId ? 'Evento actualizado exitosamente' : 'Evento registrado exitosamente');
        this.router.navigate(['/students', this.studentId, 'academic-output', 'events']);
      },
      error: (err) => {
        this.toast.error(this.eventId ? 'Error al actualizar el evento' : 'Error al registrar el evento');
        console.error(err);
      },
    });
  }

  protected cancelar(): void {
    this.router.navigate(['/students', this.studentId, 'academic-output', 'events']);
  }

  private loadEvent(): void {
    if (!this.eventId) return;
    this.saving = true;
    this.service.getEvents(Number(this.studentId)).pipe(finalize(() => this.saving = false)).subscribe({
      next: (data) => {
        const event = data.results.find(e => e.id === Number(this.eventId));
        if (event) {
          this.form.patchValue({
            titulo_trabajo: event.titulo_trabajo,
            nombre_evento: event.nombre_evento,
            tipo_evento: event.tipo_evento,
            modalidad: event.modalidad,
            rol_participacion: event.rol_participacion,
            fecha_evento: event.fecha_evento,
            lugar: event.lugar,
            evidencia: event.evidencia,
          });
          this.uploadedEvidenceId = event.evidencia;
        }
      },
      error: (err) => {
        this.toast.error('Error al cargar el evento');
        console.error(err);
      },
    });
  }
}