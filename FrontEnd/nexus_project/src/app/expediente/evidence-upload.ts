import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { Semester } from '../core/academic/academic.models';

export const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;
const EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'zip'];

@Component({
  selector: 'app-evidence-upload', imports: [CommonModule, FormsModule],
  styles: [`
    .tabs{display:flex;border-bottom:1px solid var(--border);padding:0 24px}.tabs button{border:0;border-bottom:2px solid transparent;background:none;color:var(--text-muted);padding:13px 16px;font-weight:600;cursor:pointer}.tabs button.active{border-color:var(--brand);color:var(--brand)}
    form,.link-panel{display:grid;gap:15px;padding:24px;background:var(--surface-warm)}label{display:grid;gap:7px;color:var(--heading);font-size:13px;font-weight:700}.input{border:1px solid var(--border);border-radius:8px;background:var(--surface);padding:10px 12px;color:var(--text);font:inherit}.input::placeholder{color:var(--placeholder)}
    .dropzone{border:1.5px dashed var(--border);border-radius:8px;background:var(--surface-warm);padding:28px 16px;text-align:center;cursor:pointer}.dropzone input{position:absolute;opacity:0;pointer-events:none}.dropzone strong,.dropzone span{display:block}.dropzone strong{color:var(--heading);font-size:14px;margin:8px 0 4px}.dropzone span{color:var(--text-muted);font-size:12px}.file-icon{color:var(--brand);font-size:28px}.selected{color:var(--brand)!important}.error{color:var(--danger);font-size:13px}.actions{display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--border);background:var(--surface);padding:16px 20px}.link-panel{color:var(--text-muted);font-size:13px;min-height:180px;place-content:center;text-align:center}
  `],
  template: `
    <div class="tabs" role="tablist"><button type="button" [class.active]="tab === 'file'" (click)="tab = 'file'">Archivo Local</button><button type="button" [class.active]="tab === 'link'" (click)="tab = 'link'">Enlace Digital (DOI/URL)</button></div>
    @if (tab === 'file') {
      <form (ngSubmit)="submit()">
        <label class="dropzone" for="evidence-file" (dragover)="allowDrop($event)" (drop)="dropFile($event)"><input id="evidence-file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.docx,.zip,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip" (change)="selectFile($event)"><span class="file-icon">⇧</span><strong>{{ file?.name || 'Haz clic para explorar o arrastra un archivo' }}</strong><span>PDF, JPG, PNG, DOCX o ZIP hasta 15MB</span></label>
        <label>Título de Evidencia<input class="input" name="title" [(ngModel)]="title" required maxlength="255" placeholder="Ej. Certificado de Asistencia Congreso 2024"></label>
        <label>Tipo de actividad<select class="input" name="activityType" [(ngModel)]="activityType" required><option value="TUTORIA">Tutoría</option><option value="ACUERDO">Acuerdo</option><option value="TESIS">Tesis</option><option value="OTRO">Otro</option></select></label>
        <label>Semestre<select class="input" name="semester" [(ngModel)]="semesterId"><option [ngValue]="null">Sin semestre</option>@for (semester of semesters; track semester.id) { <option [ngValue]="semester.id">Semestre {{ semester.numero }}</option> }</select></label>
        @if (error) { <p class="error" role="alert">{{ error }}</p> }
        <footer class="actions"><button type="button" class="btn-secondary" (click)="cancelled.emit()">Cancelar</button><button type="submit" class="btn-primary" [disabled]="uploading || !title.trim() || !file">{{ uploading ? 'Vinculando…' : 'Vincular Evidencia' }}</button></footer>
      </form>
    } @else { <div class="link-panel">La vinculación por enlace estará disponible próximamente.</div><footer class="actions"><button class="btn-secondary" (click)="cancelled.emit()">Cancelar</button></footer> }
  `,
})
export class EvidenceUploadComponent {
  private readonly service = inject(AcademicService);
  @Input({ required: true }) studentId!: number;
  @Input() semesters: Semester[] = [];
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  tab: 'file' | 'link' = 'file'; title = ''; activityType = 'OTRO'; semesterId: number | null = null; file: File | null = null;
  error = ''; uploading = false;
  selectFile(event: Event): void { this.validateFile((event.target as HTMLInputElement).files?.[0] ?? null, event.target as HTMLInputElement); }
  allowDrop(event: DragEvent): void { event.preventDefault(); }
  dropFile(event: DragEvent): void { event.preventDefault(); this.validateFile(event.dataTransfer?.files[0] ?? null); }
  private validateFile(file: File | null, input?: HTMLInputElement): void { this.error = ''; const extension = file?.name.split('.').pop()?.toLowerCase() ?? ''; if (file && file.size > MAX_EVIDENCE_BYTES) this.error = 'El archivo no puede superar 15 MiB.'; else if (file && !EXTENSIONS.includes(extension)) this.error = 'Formato de archivo no permitido.'; else this.file = file; if (this.error) { this.file = null; if (input) input.value = ''; } }
  submit(): void { if (!this.title.trim() || !this.file) { this.error = 'Complete el título y seleccione un archivo válido.'; return; } this.uploading = true; this.error = ''; this.service.uploadEvidence({ student: this.studentId, semester: this.semesterId, actividad_tipo: this.activityType, titulo: this.title.trim(), archivo_adjunto: this.file }).pipe(finalize(() => this.uploading = false)).subscribe({ next: () => this.saved.emit(), error: err => this.error = err.error?.archivo_adjunto?.[0] ?? err.error?.detail ?? 'No se pudo cargar la evidencia.' }); }
}
