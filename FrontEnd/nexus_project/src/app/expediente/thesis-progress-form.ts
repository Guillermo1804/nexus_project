import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { ThesisComponentKey, ThesisComponents } from '../core/academic/academic.models';

const COMPONENTS: { key: ThesisComponentKey; label: string }[] = [
  { key: 'protocolo', label: 'Protocolo y delimitación' },
  { key: 'marco_teorico', label: 'Estado del arte y marco teórico' },
  { key: 'metodologia', label: 'Metodología y diseño experimental' },
  { key: 'recoleccion_datos', label: 'Desarrollo / Recolección de datos' },
  { key: 'analisis_resultados', label: 'Análisis de resultados' },
  { key: 'redaccion_capitulos', label: 'Redacción de capítulos de tesis' },
];

@Component({
  selector: 'app-thesis-progress-form',
  imports: [ReactiveFormsModule],
  styleUrl: './thesis-progress-form.scss',
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="thesis-form" aria-label="Registrar avance de tesis">
      <div class="form-body">
        <div class="global-row">
          <span class="global-label">Porcentaje global (calculado)</span>
          <span class="global-value">{{ globalPercentage }}%</span>
        </div>
        <div class="progress-track" role="progressbar" aria-label="Avance global" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="globalPercentage"><span [style.width.%]="globalPercentage"></span></div>
        <p class="field-hint">El avance global es el promedio de los seis componentes; no se escribe a mano.</p>

        <fieldset formGroupName="componentes_json"><legend>Avance por componentes</legend>
          <p class="field-hint" id="components-hint">Indica el porcentaje de cada componente con el deslizador o escríbelo directamente en el campo numérico.</p>
          @for (component of components; track component.key) {
            <div class="slider-row">
              <span class="component-label" [id]="componentLabelId(component.key)">{{ component.label }}</span>
              <span class="component-value">
                <input
                  class="component-number"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  [attr.aria-labelledby]="componentLabelId(component.key)"
                  aria-describedby="components-hint"
                  [value]="draftValue(component.key)"
                  (focus)="startEditing(component.key)"
                  (input)="setComponentValue(component.key, $any($event.target).value)"
                  (blur)="normalizeComponent(component.key)"
                /><span aria-hidden="true">%</span>
              </span>
              <input
                [id]="'thesis-' + component.key"
                type="range"
                min="0"
                max="100"
                step="1"
                [attr.aria-labelledby]="componentLabelId(component.key)"
                [formControlName]="component.key"
              />
            </div>
          }
        </fieldset>

        <label for="thesis-observations">Observaciones<textarea id="thesis-observations" class="input-field" rows="4" maxlength="3000" formControlName="observaciones" placeholder="Describe los avances, hallazgos o siguientes pasos"></textarea></label>
        @if (error) { <p class="form-error" role="alert">{{ error }}</p> }
      </div>
      <footer class="form-actions"><button type="button" class="btn-secondary" (click)="cancelled.emit()">Cancelar</button><button type="submit" class="btn-primary" [disabled]="saving || form.invalid">{{ saving ? 'Guardando...' : 'Guardar' }}</button></footer>
    </form>
  `,
})
export class ThesisProgressFormComponent implements OnInit {
  @Input({ required: true }) studentId!: number;
  @Input({ required: true }) semesterId!: number;
  @Input() currentPercentage = 0;
  @Input() currentComponents: Record<string, unknown> = {};
  @Input() currentObservations = '';
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  private readonly service = inject(AcademicService);
  private readonly fb = inject(FormBuilder);
  protected readonly components = COMPONENTS;
  protected readonly componentKeys = COMPONENTS.map(({ key }) => key);
  /** Raw text of the numeric inputs, so an in-progress edit is not overwritten by the bound value. */
  protected readonly drafts: Partial<Record<ThesisComponentKey, string>> = {};
  /** Which numeric inputs the user is currently editing; only those show their draft. */
  protected readonly editing: Partial<Record<ThesisComponentKey, boolean>> = {};
  protected saving = false;
  protected error = '';
  protected readonly form = this.fb.nonNullable.group({
    componentes_json: this.fb.nonNullable.group({
      protocolo: [0, [Validators.min(0), Validators.max(100)]],
      marco_teorico: [0, [Validators.min(0), Validators.max(100)]],
      metodologia: [0, [Validators.min(0), Validators.max(100)]],
      recoleccion_datos: [0, [Validators.min(0), Validators.max(100)]],
      analisis_resultados: [0, [Validators.min(0), Validators.max(100)]],
      redaccion_capitulos: [0, [Validators.min(0), Validators.max(100)]],
    }),
    observaciones: ['', Validators.maxLength(3000)],
  });

  ngOnInit(): void {
    const values = Object.fromEntries(COMPONENTS.map(({ key }) => [key, this.validPercentage(this.componentInput(this.currentComponents[key]))])) as ThesisComponents;
    this.form.patchValue({ componentes_json: values, observaciones: this.currentObservations });
    for (const key of this.componentKeys) this.drafts[key] = String(this.componentValue(key));
  }

  /** Acepta tanto el número simple ({protocolo: 40}) como la forma {porcentaje, estado} del seed. */
  private componentInput(raw: unknown): number {
    if (typeof raw === 'number') return raw;
    if (raw && typeof raw === 'object') {
      const porcentaje = (raw as Record<string, unknown>)['porcentaje'];
      if (typeof porcentaje === 'number') return porcentaje;
    }
    return 0;
  }

  /** El global nunca se escribe a mano: promedio simple de los seis componentes. */
  protected get globalPercentage(): number {
    const total = this.componentKeys.reduce((suma, key) => suma + this.componentValue(key), 0);
    return Math.round(total / this.componentKeys.length);
  }
  protected componentValue(key: ThesisComponentKey): number { return this.form.controls.componentes_json.controls[key].value; }
  protected componentLabelId(key: ThesisComponentKey): string { return `thesis-${key}-label`; }
  protected draftValue(key: ThesisComponentKey): string {
    return this.editing[key] ? this.drafts[key] ?? '' : String(this.componentValue(key));
  }

  protected startEditing(key: ThesisComponentKey): void { this.editing[key] = true; }

  protected setComponentValue(key: ThesisComponentKey, raw: string): void {
    const text = String(raw ?? '').trim();
    this.drafts[key] = text;
    if (text === '') return;
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) return;
    this.form.controls.componentes_json.controls[key].setValue(Math.min(100, Math.max(0, Math.round(parsed))));
  }

  /** Ends the edit: the field goes back to showing the stored value, so the slider stays in sync. */
  protected normalizeComponent(key: ThesisComponentKey): void {
    this.editing[key] = false;
    this.drafts[key] = String(this.componentValue(key));
  }

  protected submit(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    this.saving = true; this.error = '';
    this.service.createThesisProgress({ student: this.studentId, semester: this.semesterId, porcentaje_avance: this.globalPercentage, componentes_json: value.componentes_json, observaciones: value.observaciones.trim() })
      .pipe(finalize(() => this.saving = false)).subscribe({
        next: () => this.saved.emit(),
        error: err => this.error = err.status === 403 ? 'No tienes permiso para registrar avances de este estudiante.' : err.error?.porcentaje_avance?.[0] || err.error?.componentes_json?.[0] || err.error?.semester?.[0] || err.error?.detail || 'No fue posible registrar el avance de tesis.',
      });
  }

  private validPercentage(value: unknown): number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100 ? value : 0; }
}
