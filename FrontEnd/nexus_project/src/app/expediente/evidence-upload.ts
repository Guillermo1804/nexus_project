import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { Semester } from '../core/academic/academic.models';

export const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;
const EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'zip'];

@Component({
  selector: 'app-evidence-upload',
  imports: [CommonModule, FormsModule],
  template: `
    <form (ngSubmit)="submit()" aria-labelledby="evidence-title">
      <h3 id="evidence-title">Cargar evidencia</h3>
      <label for="evidence-title-input">Título</label>
      <input id="evidence-title-input" name="title" [(ngModel)]="title" required maxlength="255">
      <label for="activity-type">Tipo de actividad</label>
      <select id="activity-type" name="activityType" [(ngModel)]="activityType" required>
        <option value="TUTORIA">Tutoría</option><option value="ACUERDO">Acuerdo</option>
        <option value="TESIS">Tesis</option><option value="OTRO">Otro</option>
      </select>
      <label for="semester">Semestre</label>
      <select id="semester" name="semester" [(ngModel)]="semesterId">
        <option [ngValue]="null">Sin semestre</option>
        @for (semester of semesters; track semester.id) { <option [ngValue]="semester.id">Semestre {{ semester.numero }}</option> }
      </select>
      <label for="evidence-file">Archivo (PDF, PNG, JPG, DOCX o ZIP; máximo 15 MiB)</label>
      <input id="evidence-file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.docx,.zip,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip" (change)="selectFile($event)">
      @if (error) { <p role="alert">{{ error }}</p> }
      @if (success) { <p role="status">Evidencia cargada correctamente.</p> }
      <button type="submit" [disabled]="uploading">{{ uploading ? 'Cargando…' : 'Cargar evidencia' }}</button>
    </form>
  `,
})
export class EvidenceUploadComponent {
  private readonly service = inject(AcademicService);
  @Input({ required: true }) studentId!: number;
  @Input() semesters: Semester[] = [];
  @Output() saved = new EventEmitter<void>();
  title = ''; activityType = 'OTRO'; semesterId: number | null = null; file: File | null = null;
  error = ''; success = false; uploading = false;

  selectFile(event: Event): void {
    this.error = ''; this.success = false;
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    const extension = file?.name.split('.').pop()?.toLowerCase() ?? '';
    if (file && file.size > MAX_EVIDENCE_BYTES) this.error = 'El archivo no puede superar 15 MiB.';
    else if (file && !EXTENSIONS.includes(extension)) this.error = 'Formato de archivo no permitido.';
    else this.file = file;
    if (this.error) { this.file = null; (event.target as HTMLInputElement).value = ''; }
  }

  submit(): void {
    if (!this.title.trim() || !this.file) { this.error = 'Complete el título y seleccione un archivo válido.'; return; }
    this.uploading = true; this.error = ''; this.success = false;
    this.service.uploadEvidence({ student: this.studentId, semester: this.semesterId, actividad_tipo: this.activityType, titulo: this.title.trim(), archivo_adjunto: this.file })
      .pipe(finalize(() => this.uploading = false)).subscribe({
        next: () => { this.success = true; this.saved.emit(); },
        error: err => this.error = err.error?.archivo_adjunto?.[0] ?? err.error?.detail ?? 'No se pudo cargar la evidencia.',
      });
  }
}
