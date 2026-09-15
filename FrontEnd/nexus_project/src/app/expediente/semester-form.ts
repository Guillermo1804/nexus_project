import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';

function validDates(control: AbstractControl): ValidationErrors | null {
  const { fecha_inicio, fecha_fin } = control.value;
  return fecha_inicio && fecha_fin && fecha_fin < fecha_inicio ? { dateRange: true } : null;
}

@Component({
  selector: 'app-semester-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="sem-form" aria-label="Registrar semestre">
      <label>Número de semestre (1 al 6)
        <select formControlName="numero">
          @for (numero of numbers; track numero) { <option [ngValue]="numero">Semestre {{ numero }}</option> }
        </select>
      </label>
      <label>Fecha de inicio <input type="date" formControlName="fecha_inicio" aria-describedby="semester-date-error" /></label>
      <label>Fecha de fin <input type="date" formControlName="fecha_fin" aria-describedby="semester-date-error" [attr.aria-invalid]="form.hasError('dateRange')" /></label>
      @if (form.hasError('dateRange') && form.touched) {
        <p id="semester-date-error" class="error-inline" role="alert">La fecha de fin debe ser posterior o igual a la fecha de inicio.</p>
      }
      <label class="checkbox-label"><input type="checkbox" formControlName="is_active" /> Semestre activo</label>
      @if (error) { <p class="error-inline" role="alert" aria-live="assertive">{{ error }}</p> }
      <button type="submit" class="btn-save-sem" [disabled]="saving">{{ saving ? 'Guardando...' : 'Guardar Semestre' }}</button>
    </form>
  `,
})
export class SemesterFormComponent {
  @Input({ required: true }) studentId!: number;
  @Output() saved = new EventEmitter<void>();
  private readonly service = inject(AcademicService);
  private readonly fb = inject(FormBuilder);
  protected readonly numbers = [1, 2, 3, 4, 5, 6];
  protected saving = false;
  protected error = '';
  protected readonly form = this.fb.nonNullable.group({
    numero: [1, [Validators.required, Validators.min(1), Validators.max(6)]],
    fecha_inicio: ['', Validators.required], fecha_fin: ['', Validators.required], is_active: [true],
  }, { validators: validDates });

  protected submit(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true; this.error = '';
    this.service.createSemester(this.studentId, this.form.getRawValue()).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => { this.form.reset({ numero: 1, fecha_inicio: '', fecha_fin: '', is_active: true }); this.saved.emit(); },
      error: err => this.error = err.error?.numero?.[0] || err.error?.fecha_fin?.[0] || 'No fue posible registrar el semestre.',
    });
  }
}
