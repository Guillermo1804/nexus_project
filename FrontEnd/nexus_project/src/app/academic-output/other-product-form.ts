import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { OTHER_PRODUCT_TYPES } from '../core/academic/academic.models';

@Component({
  selector: 'app-other-product-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './other-product-form.html',
  styleUrls: ['./other-product-form.scss']
})
export class OtherProductFormComponent {
  @Input({ required: true }) studentId!: number;
  @Input({ required: true }) semesterId!: number;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AcademicService);
  saving = false;
  error = '';

  form = this.fb.nonNullable.group({
    student: [this.studentId],
    semester: [this.semesterId],
    titulo: ['', Validators.required],
    tipo_producto: ['', Validators.required],
    descripcion: ['', Validators.required],
    fecha_registro: [{ value: '', validators: Validators.required }],
    enlace_web: [''],
    evidencia: [null as number | null]
  });

  get productTypes() {
    return OTHER_PRODUCT_TYPES;
  }

  submit() {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.saving = true; this.error = '';
    this.service.createOtherProduct(v).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => this.saved.emit(),
      error: err => this.error = err.error?.detail || err.error?.non_field_errors?.[0] || 'No fue posible registrar el producto.'
    });
  }
}