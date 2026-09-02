import { Component, OnInit, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThesisService } from '../../../core/services/thesis.service';
import { ThesisProgress, ThesisComponents } from '../../../core/models/thesis.model';

@Component({
  selector: 'app-thesis-progress-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './thesis-progress-form.component.html',
  styleUrls: ['./thesis-progress-form.component.scss']
})
export class ThesisProgressFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private thesisService = inject(ThesisService);

  readonly studentId = input<number>(0);
  readonly semesterId = input<number>(1);
  readonly isOpen = model<boolean>(false);

  readonly progressSaved = output<ThesisProgress>();
  readonly closed = output<void>();

  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Acordeón UI state
  readonly activeAccordion = signal<string | null>('protocolo');

  form: FormGroup = this.fb.group({
    porcentaje_avance: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    protocolo: [0, [Validators.min(0), Validators.max(100)]],
    estadoArte: [0, [Validators.min(0), Validators.max(100)]],
    marcoTeorico: [0, [Validators.min(0), Validators.max(100)]],
    metodologia: [0, [Validators.min(0), Validators.max(100)]],
    analisis: [0, [Validators.min(0), Validators.max(100)]],
    redaccion: [0, [Validators.min(0), Validators.max(100)]],
    observaciones: [''],
    fecha_registro: [new Date().toISOString().split('T')[0], [Validators.required]]
  });

  // Computed average of components
  readonly calculatedAverage = computed(() => {
    // Access form values reactively through signal or getter
    const vals = [
      this.form.get('protocolo')?.value || 0,
      this.form.get('estadoArte')?.value || 0,
      this.form.get('marcoTeorico')?.value || 0,
      this.form.get('metodologia')?.value || 0,
      this.form.get('analisis')?.value || 0,
      this.form.get('redaccion')?.value || 0
    ];
    const sum = vals.reduce((acc, curr) => acc + Number(curr), 0);
    return Math.round(sum / vals.length);
  });

  ngOnInit(): void {
    // Watch form value changes to trigger auto calculation if desired
  }

  toggleAccordion(section: string): void {
    this.activeAccordion.update(curr => curr === section ? null : section);
  }

  applyCalculatedAverage(): void {
    const avg = this.calculatedAverage();
    this.form.patchValue({ porcentaje_avance: avg });
  }

  onGlobalSliderChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.form.patchValue({ porcentaje_avance: val });
  }

  onComponentSliderChange(key: string, event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.form.patchValue({ [key]: val });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Por favor complete correctamente todos los campos obligatorios.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const fv = this.form.value;
    const components: ThesisComponents = {
      protocolo: Number(fv.protocolo || 0),
      estadoArte: Number(fv.estadoArte || 0),
      marcoTeorico: Number(fv.marcoTeorico || 0),
      metodologia: Number(fv.metodologia || 0),
      analisis: Number(fv.analisis || 0),
      redaccion: Number(fv.redaccion || 0)
    };

    const payload = {
      student: this.studentId(),
      semester: this.semesterId(),
      porcentaje_avance: Number(fv.porcentaje_avance),
      componentes_json: components,
      observaciones: fv.observaciones || '',
      fecha_registro: fv.fecha_registro
    };

    this.thesisService.createThesisProgress(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set('Avance de tesis registrado exitosamente.');
        this.progressSaved.emit(res.thesis_progress);
        setTimeout(() => {
          this.closeModal();
        }, 1200);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errorDetail = err?.error?.detail || err?.error?.mensaje || 'Error al guardar el avance de tesis.';
        this.errorMessage.set(errorDetail);
      }
    });
  }

  closeModal(): void {
    this.isOpen.set(false);
    this.closed.emit();
    this.form.reset({
      porcentaje_avance: 0,
      protocolo: 0,
      estadoArte: 0,
      marcoTeorico: 0,
      metodologia: 0,
      analisis: 0,
      redaccion: 0,
      observaciones: '',
      fecha_registro: new Date().toISOString().split('T')[0]
    });
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}
