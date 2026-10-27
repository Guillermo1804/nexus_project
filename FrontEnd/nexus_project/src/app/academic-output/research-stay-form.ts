import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';

@Component({
  selector: 'app-research-stay-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './research-stay-form.html',
  styleUrl: './research-stay-form.scss',
})
export class ResearchStayFormComponent {
  @Input({ required: true }) studentId!: number;
  @Input({ required: true }) semesterId!: number;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AcademicService);

  saving = false;
  error = '';
  uploadedEvidenceId: number | null = null;
  maxDate = new Date().toISOString().split('T')[0];

  isEditMode(): boolean {
    return false;
  }

  cancelar(): void {
    this.cancelled.emit();
  }

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      this.uploadEvidence(file);
    }
  }

  private uploadEvidence(file: File): void {
    this.saving = true;
    this.error = '';
    this.service.uploadEventEvidence(this.studentId, this.semesterId || null, file).pipe(
      finalize(() => this.saving = false)
    ).subscribe({
      next: (res) => {
        this.uploadedEvidenceId = res.id;
        this.form.patchValue({ evidencia: res.id });
      },
      error: (err) => {
        this.error = err.error?.detail || err.error?.non_field_errors?.[0] || 'No fue posible subir la evidencia.';
      }
    });
  }

  form = this.fb.nonNullable.group({
    institucion_destino: ['', Validators.required],
    pais: ['', Validators.required],
    fecha_inicio: ['', Validators.required],
    fecha_fin: ['', Validators.required],
    investigador_anfitrion: ['', Validators.required],
    objetivos: ['', Validators.required],
    resultados: [''],
    evidencia: [null as number | null],
  });

  submit() {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    if (v.fecha_fin < v.fecha_inicio) { this.error = 'La fecha de fin debe ser posterior a la de inicio.'; return; }
    this.saving = true; this.error = '';
    this.service.createResearchStay({
      student: this.studentId,
      semester: this.semesterId || null,
      institucion_destino: v.institucion_destino,
      pais: v.pais,
      fecha_inicio: v.fecha_inicio,
      fecha_fin: v.fecha_fin,
      investigador_anfitrion: v.investigador_anfitrion,
      objetivos: v.objetivos,
      resultados: v.resultados,
      evidencia: v.evidencia,
    }).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => this.saved.emit(),
      error: err => this.error = err.error?.detail || err.error?.non_field_errors?.[0] || 'No fue posible registrar la estancia.',
    });
  }
}