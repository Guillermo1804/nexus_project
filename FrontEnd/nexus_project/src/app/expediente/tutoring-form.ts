import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Semester } from '../core/academic/academic.models';
import { AcademicService } from '../core/academic/academic.service';

@Component({
  selector: 'app-tutoring-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="semester-form" aria-label="Registrar tutoría">
      <div class="form-row">
        <div class="field"><label for="tut-semestre">Semestre</label><select id="tut-semestre" formControlName="semester">
          @for (semester of semesters; track semester.id) { <option [value]="semester.id">Semestre {{ semester.numero }}</option> }
        </select></div>
        <div class="field"><label for="tut-fecha">Fecha de sesión</label><input id="tut-fecha" type="date" formControlName="fecha_sesion" /></div>
        <div class="field"><label for="tut-modalidad">Modalidad</label><select id="tut-modalidad" formControlName="modalidad">
          <option value="PRESENCIAL">Presencial</option><option value="VIRTUAL">Virtual</option><option value="HIBRIDA">Híbrida</option>
        </select></div>
      </div>
      <div class="field field-full"><label for="tut-resumen">Resumen de la sesión</label><input id="tut-resumen" formControlName="resumen" /></div>
      <div class="form-row">
        <div class="field"><label for="tut-prox-fecha">Próxima reunión (opcional)</label><input id="tut-prox-fecha" type="date" formControlName="proxima_reunion_fecha" /></div>
        <div class="field"><label for="tut-prox-notas">Notas próxima reunión (opcional)</label><input id="tut-prox-notas" formControlName="proxima_reunion_notas" /></div>
      </div>
      @if (error) { <p class="error-msg" role="alert" aria-live="assertive">{{ error }}</p> }
      <div class="form-actions"><button type="button" class="btn-cancel" (click)="cancelled.emit()">Cancelar</button>
        <button type="submit" class="btn-submit" [disabled]="saving">{{ saving ? 'Registrando...' : 'Registrar tutoría' }}</button></div>
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
  protected readonly form = this.fb.nonNullable.group({
    semester: [0, Validators.required], fecha_sesion: [new Date().toISOString().split('T')[0], Validators.required],
    modalidad: ['PRESENCIAL' as 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA', Validators.required], resumen: ['', Validators.required],
    proxima_reunion_fecha: [''], proxima_reunion_notas: [''],
  });

  ngOnInit(): void { this.form.patchValue({ semester: this.currentSemesterId || this.semesters[0]?.id || 0 }); }
  protected submit(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    if (!value.semester) { this.error = 'El estudiante debe contar con al menos un semestre registrado para registrar su tutoría.'; return; }
    this.saving = true; this.error = '';
    this.service.createTutoringSession({ student: this.studentId, semester: Number(value.semester), fecha_sesion: value.fecha_sesion,
      modalidad: value.modalidad, resumen: value.resumen, proxima_reunion_fecha: value.proxima_reunion_fecha || undefined,
      proxima_reunion_notas: value.proxima_reunion_notas || undefined }).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => this.saved.emit(),
      error: err => this.error = err.error?.detail || err.error?.resumen?.[0] || 'Error al registrar la sesión de tutoría.',
    });
  }
}
