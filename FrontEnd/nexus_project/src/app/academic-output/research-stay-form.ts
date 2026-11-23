import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
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
export class ResearchStayFormComponent implements OnInit {
  @Input({ required: true }) studentId!: number;
  @Input({ required: true }) semesterId!: number;
  @Input() stayId: number | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AcademicService);

  saving = false;
  error = '';
  uploadedEvidenceId: number | null = null;
  maxDate = new Date().toISOString().split('T')[0];

  isEditMode(): boolean {
    return this.stayId !== null;
  }

  ngOnInit(): void {
    if (!this.stayId) return;

    this.saving = true;
    this.service.getResearchStays(this.studentId).pipe(
      finalize(() => this.saving = false)
    ).subscribe({
      next: (data: any) => {
        const stay = (data.results || data).find((item: any) => item.id === this.stayId);
        if (!stay) {
          this.error = 'No fue posible encontrar la estancia que desea editar.';
          return;
        }

        this.form.patchValue({
          institucion_destino: stay.institucion_destino,
          pais: stay.pais,
          fecha_inicio: stay.fecha_inicio,
          fecha_fin: stay.fecha_fin,
          investigador_anfitrion: stay.investigador_anfitrion,
          objetivos: stay.objetivos,
          resultados: stay.resultados,
          evidencia: stay.evidencia ?? null,
        });
        this.uploadedEvidenceId = stay.evidencia ?? null;
      },
      error: () => {
        this.error = 'No fue posible cargar la estancia para editar.';
      },
    });
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
    const data = {
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
    };
    const request = this.isEditMode()
      ? this.service.updateResearchStay(this.stayId!, data)
      : this.service.createResearchStay(data);

    request.pipe(finalize(() => this.saving = false)).subscribe({
      next: () => this.saved.emit(),
      error: err => this.error = err.error?.detail || err.error?.non_field_errors?.[0] || 'No fue posible registrar la estancia.',
    });
  }
}