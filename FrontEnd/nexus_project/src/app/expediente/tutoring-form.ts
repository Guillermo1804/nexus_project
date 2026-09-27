import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Semester } from '../core/academic/academic.models';
import { AcademicService } from '../core/academic/academic.service';

const significantTextValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '');
  const significantLength = value.replace(/\s+/g, ' ').trim().length;
  return significantLength >= 10 ? null : { significantMinLength: true };
};

const notPastDateValidator = (today: string): ValidatorFn => (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '');
  return value && value >= today ? null : { pastDate: true };
};

const localDateString = (): string => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

@Component({
  selector: 'app-tutoring-form',
  imports: [ReactiveFormsModule],
    styleUrl: './tutoring-form.scss',
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="semester-form" aria-label="Registrar tutoría">
      <div class="form-row">
        <div class="field"><label for="tut-semestre">Semestre</label><select id="tut-semestre" formControlName="semester" [attr.aria-invalid]="form.controls.semester.invalid && form.controls.semester.touched" aria-describedby="tut-semestre-error">
          @for (semester of semesters; track semester.id) { <option [value]="semester.id">Semestre {{ semester.numero }}</option> }
        </select>@if (form.controls.semester.invalid && form.controls.semester.touched) { <span id="tut-semestre-error" class="field-error">Selecciona un semestre activo.</span> }</div>
        <div class="field"><label for="tut-fecha">Fecha de sesión</label><input id="tut-fecha" type="date" formControlName="fecha_sesion" [attr.min]="today" [attr.aria-invalid]="form.controls.fecha_sesion.invalid && form.controls.fecha_sesion.touched" aria-describedby="tut-fecha-error" />@if (form.controls.fecha_sesion.invalid && form.controls.fecha_sesion.touched) { <span id="tut-fecha-error" class="field-error">La fecha debe ser hoy o posterior.</span> }</div>
        <div class="field"><label for="tut-modalidad">Modalidad</label><select id="tut-modalidad" formControlName="modalidad" [attr.aria-invalid]="form.controls.modalidad.invalid && form.controls.modalidad.touched">
          <option value="PRESENCIAL">Presencial</option><option value="VIRTUAL">Virtual</option><option value="HIBRIDA">Híbrida</option>
        </select></div>
      </div>
      <div class="field field-full">

        <label for="tut-resumen">
          Resumen de la sesión
          <span class="required-mark">*</span>
          <span class="required-text">Obligatorio</span>
        </label>

        <textarea
          id="tut-resumen"
          formControlName="resumen"
          rows="3"
          placeholder="Describe brevemente los temas tratados"
          [class.input-invalid]="
            form.controls.resumen.invalid &&
            form.controls.resumen.touched
          "
            [attr.aria-invalid]="form.controls.resumen.invalid && form.controls.resumen.touched"
            aria-describedby="tut-resumen-error"
        ></textarea>

        @if (
          form.controls.resumen.invalid &&
          form.controls.resumen.touched
        ) {
          <span id="tut-resumen-error" class="field-error">
            El resumen debe tener entre 10 y 2000 caracteres significativos.
          </span>
        }

      </div>
      <div class="form-row">
        <div class="field"><label for="tut-prox-fecha">Próxima reunión (opcional)</label><input id="tut-prox-fecha" type="date" formControlName="proxima_reunion_fecha" aria-describedby="tut-prox-fecha-error" />@if (form.controls.proxima_reunion_fecha.invalid && form.controls.proxima_reunion_fecha.touched) { <span id="tut-prox-fecha-error" class="field-error">Indica la fecha de la próxima reunión si registras notas.</span> }</div>
        <div class="field"><label for="tut-prox-notas">Notas próxima reunión (opcional)</label><input id="tut-prox-notas" formControlName="proxima_reunion_notas" /></div>
      </div>
      @if (error) { <p class="error-msg" role="alert" aria-live="assertive">{{ error }}</p> }
      <div class="form-actions"><button type="button" class="btn-cancel" (click)="cancelled.emit()">Cancelar</button>
        <button type="submit" class="btn-submit" [disabled]="saving || form.invalid">{{ saving ? 'Registrando...' : 'Registrar tutoría' }}</button></div>
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
    proxima_reunion_fecha: [''], proxima_reunion_notas: [''],
  });

  ngOnInit(): void { this.form.patchValue({ semester: this.currentSemesterId || this.semesters[0]?.id || 0 }); }
  protected submit(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    const value = this.form.getRawValue();
    const semester = this.semesters.find(item => item.id === Number(value.semester));
    if (!semester || !semester.is_active) {
      this.form.controls.semester.setErrors({ inactive: true });
      this.form.controls.semester.markAsTouched();
      this.error = 'Selecciona un semestre activo.';
      this.focusFirstInvalid();
      return;
    }
    if (value.fecha_sesion < semester.fecha_inicio) {
      this.form.controls.fecha_sesion.setErrors({ beforeSemester: true });
      this.form.controls.fecha_sesion.markAsTouched();
      this.error = 'La fecha de la sesión no puede ser anterior al inicio del semestre.';
      this.focusFirstInvalid();
      return;
    }
    if (value.proxima_reunion_notas && !value.proxima_reunion_fecha) {
      this.form.controls.proxima_reunion_fecha.setErrors({ requiredForNotes: true });
      this.form.controls.proxima_reunion_fecha.markAsTouched();
      this.error = 'Indica la fecha de la próxima reunión para registrar notas.';
      this.focusFirstInvalid();
      return;
    }
    this.saving = true; this.error = '';
    this.service.createTutoringSession({ student: this.studentId, semester: Number(value.semester), fecha_sesion: value.fecha_sesion,
      modalidad: value.modalidad, resumen: value.resumen, proxima_reunion_fecha: value.proxima_reunion_fecha || undefined,
      proxima_reunion_notas: value.proxima_reunion_notas || undefined }).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => this.saved.emit(),
      error: err => this.error = err.error?.detail || err.error?.resumen?.[0] || err.error?.fecha_sesion?.[0] || err.error?.semester?.[0] || err.error?.proxima_reunion_fecha?.[0] || 'Error al registrar la sesión de tutoría.',
    });
  }

  private focusFirstInvalid(): void {
    queueMicrotask(() => {
      const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      firstInvalid?.focus();
    });
  }
}
