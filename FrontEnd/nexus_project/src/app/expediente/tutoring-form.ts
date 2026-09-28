import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Semester } from '../core/academic/academic.models';
import { AcademicService } from '../core/academic/academic.service';

const significantTextValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  String(control.value ?? '').replace(/\s+/g, ' ').trim().length >= 10 ? null : { significantMinLength: true };
const notPastDateValidator = (today: string): ValidatorFn => (control: AbstractControl): ValidationErrors | null =>
  String(control.value ?? '') >= today ? null : { pastDate: true };
const localDateString = (): string => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

@Component({
  selector: 'app-tutoring-form',
  imports: [ReactiveFormsModule],
  styleUrl: './tutoring-form.scss',
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="tutoring-form" aria-label="Registrar tutoría">
      <div class="form-body">
        <div class="form-column">
          <label for="tut-fecha">Fecha de Sesión<input id="tut-fecha" type="date" formControlName="fecha_sesion" [attr.min]="today" [attr.aria-invalid]="form.controls.fecha_sesion.invalid && form.controls.fecha_sesion.touched" /></label>
          @if (form.controls.fecha_sesion.invalid && form.controls.fecha_sesion.touched) { <span class="field-error">La fecha debe ser hoy o posterior.</span> }
          <label for="tut-semestre">Semestre Académico<select id="tut-semestre" formControlName="semester" [attr.aria-invalid]="form.controls.semester.invalid && form.controls.semester.touched">@for (semester of activeSemesters; track semester.id) { <option [value]="semester.id">Semestre {{ semester.numero }}</option> }</select></label>
          @if (form.controls.semester.invalid && form.controls.semester.touched) { <span class="field-error">Selecciona un semestre activo.</span> }
          <label for="tut-modalidad">Modalidad<select id="tut-modalidad" formControlName="modalidad"><option value="PRESENCIAL">Presencial</option><option value="VIRTUAL">Virtual</option><option value="HIBRIDA">Híbrida</option></select></label>
        </div>
        <div class="form-column">
          <label for="tut-resumen">Resumen General de la Sesión<textarea id="tut-resumen" formControlName="resumen" rows="6" maxlength="2000" placeholder="Describe los temas tratados, avances revisados y acuerdos principales" [attr.aria-invalid]="form.controls.resumen.invalid && form.controls.resumen.touched"></textarea></label>
          @if (form.controls.resumen.invalid && form.controls.resumen.touched) { <span class="field-error">El resumen debe tener entre 10 y 2000 caracteres significativos.</span> }
          <div class="next-meeting"><label for="next-date">Próxima reunión<input id="next-date" type="date" formControlName="proxima_reunion_fecha" [attr.min]="today"></label><label for="next-notes">Notas<textarea id="next-notes" rows="2" maxlength="500" formControlName="proxima_reunion_notas" placeholder="Notas preparatorias opcionales"></textarea></label></div>
        </div>
      </div>
      @if (error) { <p class="error-msg" role="alert">{{ error }}</p> }
      <footer class="form-actions"><button type="button" class="btn-secondary" (click)="cancelled.emit()">Cancelar</button><button type="submit" class="btn-primary" [disabled]="saving || form.invalid">{{ saving ? 'Guardando...' : 'Guardar Registro' }}</button></footer>
    </form>
  `,
})
export class TutoringFormComponent {
  @Input({ required: true }) studentId!: number;
  @Input({ required: true }) semesters: Semester[] = [];
  @Input() currentSemesterId: number | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  private readonly service = inject(AcademicService);
  private readonly fb = inject(FormBuilder);
  protected saving = false;
  protected error = '';
  protected readonly today = localDateString();
  protected readonly form = this.fb.nonNullable.group({
    semester: [0, Validators.required], fecha_sesion: [this.today, [Validators.required, notPastDateValidator(this.today)]],
    modalidad: ['PRESENCIAL' as 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA', Validators.required], resumen: ['', [Validators.required, Validators.maxLength(2000), significantTextValidator]],
    proxima_reunion_fecha: [''], proxima_reunion_notas: ['', Validators.maxLength(500)],
  });
  protected get activeSemesters(): Semester[] { return this.semesters.filter(s => s.is_active); }
  ngOnInit(): void { this.form.patchValue({ semester: this.currentSemesterId || this.activeSemesters[0]?.id || 0 }); }
  protected submit(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); this.focusFirstInvalid(); return; }
    const value = this.form.getRawValue();
    const semester = this.semesters.find(item => item.id === Number(value.semester));
    if (!semester?.is_active) { this.form.controls.semester.setErrors({ inactive: true }); this.error = 'Selecciona un semestre activo.'; return; }
    if (value.fecha_sesion < semester.fecha_inicio) { this.form.controls.fecha_sesion.setErrors({ beforeSemester: true }); this.error = 'La fecha de la sesión no puede ser anterior al inicio del semestre.'; return; }
    this.saving = true; this.error = '';
    this.service.createTutoringSession({ student: this.studentId, semester: Number(value.semester), fecha_sesion: value.fecha_sesion, modalidad: value.modalidad, resumen: value.resumen, ...(value.proxima_reunion_fecha ? { proxima_reunion_fecha: value.proxima_reunion_fecha } : {}), ...(value.proxima_reunion_notas.trim() ? { proxima_reunion_notas: value.proxima_reunion_notas.trim() } : {}) })
      .pipe(finalize(() => this.saving = false)).subscribe({ next: () => this.saved.emit(), error: err => this.error = err.error?.detail || err.error?.resumen?.[0] || err.error?.fecha_sesion?.[0] || err.error?.semester?.[0] || 'Error al registrar la sesión de tutoría.' });
  }
  private focusFirstInvalid(): void { queueMicrotask(() => document.querySelector<HTMLElement>('.tutoring-form [aria-invalid="true"]')?.focus()); }
}
