import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { Agreement, Semester, SemesterTutoringSession } from '../core/academic/academic.models';

export const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;
const EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'zip'];
type ActivityType = 'TUTORIA' | 'ACUERDO' | 'TESIS' | 'OTRO';

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
        <label class="dropzone" for="evidence-file" (dragover)="allowDrop($event)" (drop)="dropFile($event)"><input id="evidence-file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.docx,.zip" aria-describedby="evidence-file-help evidence-file-error" (change)="selectFile($event)"><span class="file-icon">⇧</span><strong>{{ file?.name || 'Haz clic para explorar o arrastra un archivo' }}</strong><span id="evidence-file-help">PDF, JPG, PNG, DOCX o ZIP, máximo 15 MiB</span></label>
        <label>Título de Evidencia<input class="input" name="title" [(ngModel)]="title" required maxlength="255" placeholder="Ej. Certificado de Asistencia Congreso 2024"></label>
        <label>Tipo de actividad<select class="input" name="activityType" [(ngModel)]="activityType" (ngModelChange)="activityId = null" required><option value="TUTORIA">Tutoría</option><option value="ACUERDO">Acuerdo</option><option value="TESIS">Tesis</option><option value="OTRO">Otro</option></select></label>
        @if (activityType !== 'OTRO') {
          <label>Actividad<select class="input" name="activityId" [(ngModel)]="activityId" required><option [ngValue]="null" disabled>Seleccione una actividad</option>@for (activity of activities; track activity.id) { <option [ngValue]="activity.id">{{ activity.label }}</option> }</select></label>
          @if (!activities.length) { <p class="error" role="status">No hay actividades de este tipo registradas para el estudiante.</p> }
        }
        <label>Semestre<select class="input" name="semester" [(ngModel)]="semesterId" required><option [ngValue]="null" disabled>Seleccione un semestre</option>@for (semester of semesters; track semester.id) { <option [ngValue]="semester.id">Semestre {{ semester.numero }}</option> }</select></label>
        @if (error) { <p id="evidence-file-error" class="error" role="alert">{{ error }}</p> }
        <footer class="actions"><button type="button" class="btn-secondary" (click)="cancelled.emit()">Cancelar</button><button type="submit" class="btn-primary" [disabled]="!canSubmit" [attr.aria-busy]="uploading">{{ uploading ? 'Vinculando…' : 'Vincular Evidencia' }}</button></footer>
      </form>
    } @else { <div class="link-panel">La vinculación por enlace estará disponible próximamente.</div><footer class="actions"><button class="btn-secondary" (click)="cancelled.emit()">Cancelar</button></footer> }
  `,
})
export class EvidenceUploadComponent implements OnInit {
  private readonly service = inject(AcademicService);
  @Input({ required: true }) studentId!: number;
  @Input() semesters: Semester[] = [];
  @Input() tutoringSessions: SemesterTutoringSession[] = [];
  @Input() agreements: Agreement[] = [];
  @Input() thesisProgress: { id: number; fecha_registro: string | null } | null = null;
  @Input() currentSemesterId: number | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  tab: 'file' | 'link' = 'file'; title = ''; activityType: ActivityType = 'OTRO'; activityId: number | null = null; semesterId: number | null = null; file: File | null = null;
  error = ''; uploading = false;

  ngOnInit(): void { this.semesterId = this.currentSemesterId; }
  get activities(): { id: number; label: string }[] {
    if (this.activityType === 'TUTORIA') return this.tutoringSessions.map(session => ({ id: session.id, label: `${session.fecha_sesion} — ${session.modalidad}` }));
    if (this.activityType === 'ACUERDO') return this.agreements.map(agreement => ({ id: agreement.id, label: agreement.descripcion }));
    if (this.activityType === 'TESIS' && this.thesisProgress) return [{ id: this.thesisProgress.id, label: `Avance del ${this.thesisProgress.fecha_registro ?? 'semestre actual'}` }];
    return [];
  }
  get canSubmit(): boolean { return !this.uploading && !!this.title.trim() && !!this.file && this.semesterId !== null && (this.activityType === 'OTRO' || this.activityId !== null); }
  selectFile(event: Event): void { this.validateFile((event.target as HTMLInputElement).files?.[0] ?? null, event.target as HTMLInputElement); }
  allowDrop(event: DragEvent): void { event.preventDefault(); }
  dropFile(event: DragEvent): void { event.preventDefault(); this.validateFile(event.dataTransfer?.files[0] ?? null); }
  private validateFile(file: File | null, input?: HTMLInputElement): void { this.error = ''; const extension = file?.name.split('.').pop()?.toLowerCase() ?? ''; if (file && file.size > MAX_EVIDENCE_BYTES) this.error = 'El archivo no puede superar 15 MiB.'; else if (file && !EXTENSIONS.includes(extension)) this.error = 'Formato de archivo no permitido.'; else this.file = file; if (this.error) { this.file = null; if (input) input.value = ''; } }
  submit(): void {
    if (!this.canSubmit || !this.file) { this.error = 'Complete los campos requeridos y seleccione un archivo válido.'; return; }
    this.uploading = true; this.error = '';
    this.service.uploadEvidence({ student: this.studentId, semester: this.semesterId, actividad_tipo: this.activityType, ...(this.activityId !== null && { actividad_id: this.activityId }), titulo: this.title.trim(), archivo_adjunto: this.file }).pipe(finalize(() => this.uploading = false)).subscribe({ next: () => this.saved.emit(), error: err => this.error = err.error?.actividad_id?.[0] ?? err.error?.archivo_adjunto?.[0] ?? err.error?.detail ?? 'No se pudo cargar la evidencia.' });
  }
}
