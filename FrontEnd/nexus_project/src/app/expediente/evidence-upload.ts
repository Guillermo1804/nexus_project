import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { Agreement, Semester, SemesterTutoringSession } from '../core/academic/academic.models';

export const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;
const EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'zip'];
const DOI_PATTERN = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/;
type ActivityType = 'TUTORIA' | 'ACUERDO' | 'TESIS' | 'OTRO';

@Component({
  selector: 'app-evidence-upload', imports: [CommonModule, FormsModule],
  styles: [`
    .tabs{display:flex;border-bottom:1px solid var(--border);padding:0 24px}.tabs button{border:0;border-bottom:2px solid transparent;background:none;color:var(--text-muted);padding:13px 16px;font-weight:600;cursor:pointer}.tabs button.active{border-color:var(--brand);color:var(--brand)}
    form{display:grid;gap:15px;padding:24px;background:var(--surface-warm);min-width:0}label{display:grid;gap:7px;color:var(--heading);font-size:13px;font-weight:700}.input{box-sizing:border-box;min-width:0;max-width:100%;border:1px solid var(--border);border-radius:8px;background:var(--surface);padding:10px 12px;color:var(--text);font:inherit}.input::placeholder{color:var(--placeholder)}textarea.input{min-height:72px;resize:vertical}
    .dropzone{border:1.5px dashed var(--border);border-radius:8px;background:var(--surface-warm);padding:28px 16px;text-align:center;cursor:pointer;position:relative}.dropzone input{position:absolute;opacity:0;pointer-events:none}.dropzone strong,.dropzone span{display:block}.dropzone strong{color:var(--heading);font-size:14px;margin:8px 0 4px}.dropzone span{color:var(--text-muted);font-size:12px}.file-icon{color:var(--brand);font-size:28px}.selected{color:var(--brand)!important}.error{color:var(--danger);font-size:13px}.pending{color:var(--text-secondary);font-size:13px;margin:0}.pending strong{color:var(--heading)}.actions{display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--border);background:var(--surface);padding:16px 20px}.link-status{display:flex;align-items:center;gap:10px;font-size:13px}.link-kind{border-radius:999px;background:var(--brand-soft);color:var(--brand);font-weight:700;padding:3px 9px}.test-link{color:var(--brand);font-weight:600}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .spinner{display:inline-block;width:14px;height:14px;margin-right:7px;vertical-align:-2px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:nexus-spin .7s linear infinite}
    .upload-progress{display:grid;gap:8px;margin:0;padding:12px 20px;background:var(--surface-soft);border-top:1px solid var(--border);color:var(--text-secondary);font-size:13px}
    .upload-progress .bar{height:6px;overflow:hidden;border-radius:999px;background:var(--border)}
    .upload-progress .bar span{display:block;width:40%;height:100%;border-radius:inherit;background:var(--brand);animation:nexus-indeterminate 1.2s ease-in-out infinite}
    @keyframes nexus-spin{to{transform:rotate(360deg)}}
    @keyframes nexus-indeterminate{0%{transform:translateX(-110%)}100%{transform:translateX(260%)}}
    @media (prefers-reduced-motion: reduce){.spinner,.upload-progress .bar span{animation:none}}
  `],
  template: `
    <div class="tabs" role="tablist" aria-label="Tipo de evidencia">
      <button id="file-tab" type="button" role="tab" [attr.aria-selected]="tab === 'file'" aria-controls="file-panel" [class.active]="tab === 'file'" (click)="selectTab('file')">Archivo Local</button>
      <button id="link-tab" type="button" role="tab" [attr.aria-selected]="tab === 'link'" aria-controls="link-panel" [class.active]="tab === 'link'" (click)="selectTab('link')">Enlace Digital (DOI/URL)</button>
    </div>
    @if (tab === 'file') {
      <form id="file-panel" role="tabpanel" aria-labelledby="file-tab" (ngSubmit)="submitFile()">
        <label class="dropzone" for="evidence-file" (dragover)="allowDrop($event)" (drop)="dropFile($event)"><input id="evidence-file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.docx,.zip" aria-describedby="evidence-file-help evidence-file-error" (change)="selectFile($event)"><span class="file-icon">⇧</span><strong>{{ file?.name || 'Haz clic para explorar o arrastra un archivo' }}</strong><span id="evidence-file-help">PDF, JPG, PNG, DOCX o ZIP, máximo 15 MiB</span></label>
        <label>Título de Evidencia<input class="input" name="fileTitle" [(ngModel)]="title" required maxlength="255" placeholder="Ej. Certificado de Asistencia Congreso 2024"></label>
        <label>Descripción<textarea class="input" name="fileDescription" [(ngModel)]="description" placeholder="Descripción opcional de la evidencia"></textarea></label>
        <ng-container *ngTemplateOutlet="commonFields"></ng-container>
        @if (pendingRequirements.length) { <p class="pending" id="evidence-pending-file"><strong>Para vincular la evidencia falta:</strong> {{ pendingRequirements.join(' ') }}</p> }
        @if (error) { <p id="evidence-file-error" class="error" role="alert">{{ error }}</p> }
        <footer class="actions"><button type="button" class="btn-secondary" [disabled]="uploading" (click)="cancelled.emit()">Cancelar</button><button type="submit" class="btn-primary" [disabled]="!canSubmitFile" [attr.aria-describedby]="pendingRequirements.length ? 'evidence-pending-file' : null" [attr.aria-busy]="uploading">@if (uploading) { <span class="spinner" aria-hidden="true"></span> }{{ uploading ? 'Vinculando…' : 'Vincular Evidencia' }}</button></footer>
        @if (uploading) { <p class="upload-progress" role="status">Vinculando la evidencia con el expediente. No cierres esta ventana.<span class="bar" aria-hidden="true"><span></span></span></p> }
      </form>
    } @else {
      <form id="link-panel" role="tabpanel" aria-labelledby="link-tab" (ngSubmit)="submitLink()">
        <label>Enlace DOI o URL<input id="evidence-link" class="input" name="link" [(ngModel)]="link" required maxlength="500" placeholder="https://doi.org/10.xxxx/... o https://..." aria-describedby="evidence-link-help evidence-link-error"></label>
        <span id="evidence-link-help" class="sr-only">Ingrese una URL HTTP o HTTPS, o un DOI directo.</span>
        @if (link && !linkKind) { <p id="evidence-link-error" class="error">Proporcione una URL http/https o un DOI válido.</p> }
        @if (linkKind) { <div class="link-status"><span class="link-kind">{{ linkKind }}</span><a class="test-link" [href]="testLinkHref" target="_blank" rel="noopener noreferrer">Probar enlace<span class="sr-only"> (se abre en una nueva pestaña)</span></a></div> }
        <label>Título de Evidencia<input class="input" name="linkTitle" [(ngModel)]="title" required maxlength="255" placeholder="Ej. Repositorio de datos experimentales"></label>
        <label>Descripción<textarea class="input" name="linkDescription" [(ngModel)]="description" placeholder="Descripción opcional de la evidencia"></textarea></label>
        <ng-container *ngTemplateOutlet="commonFields"></ng-container>
        @if (pendingRequirements.length) { <p class="pending" id="evidence-pending-link"><strong>Para vincular la evidencia falta:</strong> {{ pendingRequirements.join(' ') }}</p> }
        @if (error) { <p class="error" role="alert">{{ error }}</p> }
        <footer class="actions"><button type="button" class="btn-secondary" [disabled]="uploading" (click)="cancelled.emit()">Cancelar</button><button type="submit" class="btn-primary" [disabled]="!canSubmitLink" [attr.aria-describedby]="pendingRequirements.length ? 'evidence-pending-link' : null" [attr.aria-busy]="uploading">@if (uploading) { <span class="spinner" aria-hidden="true"></span> }{{ uploading ? 'Vinculando…' : 'Vincular Evidencia' }}</button></footer>
        @if (uploading) { <p class="upload-progress" role="status">Vinculando la evidencia con el expediente. No cierres esta ventana.<span class="bar" aria-hidden="true"><span></span></span></p> }
      </form>
    }
    <ng-template #commonFields>
      <label>Tipo de actividad<select class="input" name="activityType" [(ngModel)]="activityType" (ngModelChange)="activityId = null" required><option value="TUTORIA">Tutoría</option><option value="ACUERDO">Acuerdo</option><option value="TESIS">Tesis</option><option value="OTRO">Otro</option></select></label>
      @if (activityType !== 'OTRO') {
        <label>Actividad<select class="input" name="activityId" [(ngModel)]="activityId" required><option [ngValue]="null" disabled>Seleccione una actividad</option>@for (activity of activities; track activity.id) { <option [ngValue]="activity.id">{{ activity.label }}</option> }</select></label>
        @if (!activities.length) { <p class="error" role="status">No hay actividades de este tipo registradas para el estudiante.</p> }
      }
      <label>Semestre<select class="input" name="semester" [(ngModel)]="semesterId" required><option [ngValue]="null" disabled>Seleccione un semestre</option>@for (semester of semesters; track semester.id) { <option [ngValue]="semester.id">Semestre {{ semester.numero }}</option> }</select></label>
    </ng-template>
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
  tab: 'file' | 'link' = 'file'; title = ''; description = ''; link = ''; activityType: ActivityType = 'OTRO'; activityId: number | null = null; semesterId: number | null = null; file: File | null = null;
  error = ''; uploading = false;

  ngOnInit(): void { this.semesterId = this.currentSemesterId; }
  get activities(): { id: number; label: string }[] {
    if (this.activityType === 'TUTORIA') return this.tutoringSessions.map(session => ({ id: session.id, label: `${session.fecha_sesion} — ${session.modalidad}` }));
    if (this.activityType === 'ACUERDO') return this.agreements.map(agreement => ({ id: agreement.id, label: agreement.descripcion }));
    if (this.activityType === 'TESIS' && this.thesisProgress) return [{ id: this.thesisProgress.id, label: `Avance del ${this.thesisProgress.fecha_registro ?? 'semestre actual'}` }];
    return [];
  }
  get commonFieldsValid(): boolean { return !!this.title.trim() && this.semesterId !== null && (this.activityType === 'OTRO' || this.activityId !== null); }
  /** Names what still blocks the submit button, so it is never disabled without an explanation. */
  get pendingRequirements(): string[] {
    const pending: string[] = [];
    if (this.tab === 'file' && !this.file) pending.push('un archivo (PDF, JPG, PNG, DOCX o ZIP).');
    if (this.tab === 'link' && this.linkKind === null) pending.push('un enlace válido (URL http/https o DOI).');
    if (!this.title.trim()) pending.push('el título de la evidencia.');
    if (this.semesterId === null) pending.push('el semestre.');
    if (this.activityType !== 'OTRO' && this.activityId === null) pending.push('la actividad asociada.');
    return pending;
  }
  get canSubmitFile(): boolean { return !this.uploading && this.commonFieldsValid && !!this.file; }
  get linkKind(): 'DOI' | 'URL' | null {
    const value = this.link.trim();
    if (DOI_PATTERN.test(value)) return 'DOI';
    try { const url = new URL(value); return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname ? 'URL' : null; } catch { return null; }
  }
  get testLinkHref(): string | null { return this.linkKind === 'DOI' ? `https://doi.org/${this.link.trim()}` : this.linkKind === 'URL' ? this.link.trim() : null; }
  get canSubmitLink(): boolean { return !this.uploading && this.commonFieldsValid && this.linkKind !== null; }
  selectTab(tab: 'file' | 'link'): void { this.tab = tab; this.error = ''; }
  selectFile(event: Event): void { this.validateFile((event.target as HTMLInputElement).files?.[0] ?? null, event.target as HTMLInputElement); }
  allowDrop(event: DragEvent): void { event.preventDefault(); }
  dropFile(event: DragEvent): void { event.preventDefault(); this.validateFile(event.dataTransfer?.files[0] ?? null); }
  private validateFile(file: File | null, input?: HTMLInputElement): void { this.error = ''; const extension = file?.name.split('.').pop()?.toLowerCase() ?? ''; if (file && file.size > MAX_EVIDENCE_BYTES) this.error = 'El archivo no puede superar 15 MiB.'; else if (file && !EXTENSIONS.includes(extension)) this.error = 'Formato de archivo no permitido.'; else this.file = file; if (this.error) { this.file = null; if (input) input.value = ''; } }
  private commonPayload() { return { student: this.studentId, semester: this.semesterId, actividad_tipo: this.activityType, ...(this.activityId !== null && { actividad_id: this.activityId }), titulo: this.title.trim(), descripcion: this.description.trim() }; }
  private apiError(err: any): void { this.error = err.error?.enlace_url?.[0] ?? err.error?.actividad_id?.[0] ?? err.error?.archivo_adjunto?.[0] ?? err.error?.detail ?? 'No se pudo vincular la evidencia.'; }
  submitFile(): void {
    if (!this.canSubmitFile || !this.file) { this.error = 'Complete los campos requeridos y seleccione un archivo válido.'; return; }
    this.uploading = true; this.error = '';
    this.service.uploadEvidence({ ...this.commonPayload(), archivo_adjunto: this.file }).pipe(finalize(() => this.uploading = false)).subscribe({ next: () => this.saved.emit(), error: err => this.apiError(err) });
  }
  submitLink(): void {
    if (!this.canSubmitLink) { this.error = 'Complete los campos requeridos e ingrese un enlace válido.'; return; }
    this.uploading = true; this.error = '';
    this.service.linkEvidence({ ...this.commonPayload(), tipo: 'ENLACE_DOI', enlace_url: this.link.trim() }).pipe(finalize(() => this.uploading = false)).subscribe({ next: () => this.saved.emit(), error: err => this.apiError(err) });
  }
}
