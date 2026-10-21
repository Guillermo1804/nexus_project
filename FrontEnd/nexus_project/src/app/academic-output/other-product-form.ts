import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
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
export class OtherProductFormComponent implements OnInit {
  @Input({ required: true }) studentId!: number;
  @Input({ required: true }) semesterId!: number;
  @Input() productId: number = 0;
  @Input() initialData: any = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AcademicService);
  saving = false;
  error = '';
  selectedFile: File | null = null;
  uploadingEvidence = false;

  form = this.fb.nonNullable.group({
    student: [0],
    semester: [0],
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

  get isEditMode(): boolean {
    return this.productId > 0;
  }

  ngOnInit(): void {
    this.form.patchValue({
      student: this.studentId,
      semester: this.semesterId,
    });

    if (this.isEditMode && this.initialData) {
      this.patchFormWithProductData(this.initialData);
    }
  }

  private patchFormWithProductData(product: any): void {
    const fechaRegistro = product.fecha_registro ? product.fecha_registro.split('T')[0] : '';
    this.form.patchValue({
      titulo: product.titulo || '',
      tipo_producto: product.tipo_producto || '',
      descripcion: product.descripcion || '',
      fecha_registro: fechaRegistro,
      enlace_web: product.enlace_web || '',
      evidencia: product.evidencia || null,
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.uploadEvidence();
    }
  }

  uploadEvidence(): void {
    if (!this.selectedFile) return;
    this.uploadingEvidence = true;
    this.service.uploadOtherProductEvidence(this.studentId, this.semesterId, this.selectedFile).pipe(
      finalize(() => this.uploadingEvidence = false)
    ).subscribe({
      next: (res) => {
        this.form.patchValue({ evidencia: res.id });
        this.error = '';
      },
      error: (err) => {
        console.error('Error subiendo evidencia:', err);
        this.error = err.error?.detail || 'Error al subir evidencia';
      }
    });
  }

  submit() {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    console.log('Enviando:', v);
    this.saving = true; this.error = '';
    
    const request = this.isEditMode
      ? this.service.updateOtherProduct(this.productId, v)
      : this.service.createOtherProduct(v);

    request.pipe(finalize(() => this.saving = false)).subscribe({
      next: () => this.saved.emit(),
      error: err => {
        console.error('Error backend:', err);
        const detail = err.error?.detail;
        const nonField = err.error?.non_field_errors?.[0];
        const fieldErrors = err.error ? Object.entries(err.error).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ') : '';
        this.error = detail || nonField || fieldErrors || 'No fue posible registrar el producto.';
      }
    });
  }
}