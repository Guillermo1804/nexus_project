import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EvidenceService } from '../../../core/services/evidence.service';
import { Evidence, EvidenceActivityType, EvidenceType } from '../../../core/models/evidence.model';

@Component({
  selector: 'app-evidence-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './evidence-upload.component.html',
  styleUrls: ['./evidence-upload.component.scss']
})
export class EvidenceUploadComponent {
  private fb = inject(FormBuilder);
  private evidenceService = inject(EvidenceService);

  readonly studentId = input<number>(0);
  readonly semesterId = input<number | null>(null);
  readonly defaultActivityType = input<EvidenceActivityType>('OTRO');
  readonly defaultActivityId = input<number | null>(null);
  readonly isOpen = model<boolean>(false);

  readonly evidenceUploaded = output<Evidence>();
  readonly closed = output<void>();

  readonly activeTab = signal<'FILE' | 'DOI'>('FILE');
  readonly isDragging = signal<boolean>(false);
  readonly selectedFile = signal<File | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
  readonly ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.zip'];

  readonly DOI_REGEX = /^(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+|https?:\/\/(dx\.)?doi\.org\/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+|https?:\/\/[^\s/$.?#].[^\s]*)$/i;

  fileForm: FormGroup = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(255)]],
    actividad_tipo: ['OTRO', [Validators.required]],
    actividad_id: [null],
    descripcion: ['']
  });

  doiForm: FormGroup = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(255)]],
    actividad_tipo: ['OTRO', [Validators.required]],
    actividad_id: [null],
    enlace_url: ['', [Validators.required, Validators.pattern(this.DOI_REGEX)]],
    descripcion: ['']
  });

  setTab(tab: 'FILE' | 'DOI'): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      this.handleFileSelected(event.dataTransfer.files[0]);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelected(input.files[0]);
    }
  }

  handleFileSelected(file: File): void {
    this.errorMessage.set(null);

    // Validate size
    if (file.size > this.MAX_FILE_SIZE) {
      this.errorMessage.set(`El archivo excede el tamaño máximo permitido de 15MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      this.selectedFile.set(null);
      return;
    }

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      this.errorMessage.set(`Formato de archivo no permitido (${ext}). Tipos admitidos: PDF, PNG, JPG, DOCX, ZIP.`);
      this.selectedFile.set(null);
      return;
    }

    this.selectedFile.set(file);

    // Auto-fill title if empty
    if (!this.fileForm.get('titulo')?.value) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      this.fileForm.patchValue({ titulo: cleanName });
    }
  }

  removeSelectedFile(): void {
    this.selectedFile.set(null);
  }

  onSubmitFile(): void {
    if (!this.selectedFile()) {
      this.errorMessage.set('Debe seleccionar o arrastrar un archivo de evidencia.');
      return;
    }
    if (this.fileForm.invalid) {
      this.fileForm.markAllAsTouched();
      this.errorMessage.set('Por favor complete los campos obligatorios.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const fv = this.fileForm.value;
    const data = {
      student: this.studentId(),
      semester: this.semesterId() || null,
      actividad_tipo: (fv.actividad_tipo || this.defaultActivityType() || 'OTRO') as EvidenceActivityType,
      actividad_id: fv.actividad_id || this.defaultActivityId() || null,
      titulo: fv.titulo.trim(),
      descripcion: fv.descripcion?.trim() || '',
      archivo: this.selectedFile()!
    };

    this.evidenceService.uploadFileEvidence(data).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.successMessage.set('Archivo de evidencia cargado exitosamente.');
        this.evidenceUploaded.emit(res.evidence);
        setTimeout(() => this.closeModal(), 1200);
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        const detail = err?.error?.archivo_adjunto?.[0] || err?.error?.mensaje || 'Error al cargar la evidencia.';
        this.errorMessage.set(detail);
      }
    });
  }

  onSubmitDoi(): void {
    if (this.doiForm.invalid) {
      this.doiForm.markAllAsTouched();
      this.errorMessage.set('Por favor ingrese un DOI o URL válida y el título correspondiente.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const fv = this.doiForm.value;
    const data = {
      student: this.studentId(),
      semester: this.semesterId() || null,
      actividad_tipo: (fv.actividad_tipo || this.defaultActivityType() || 'OTRO') as EvidenceActivityType,
      actividad_id: fv.actividad_id || this.defaultActivityId() || null,
      titulo: fv.titulo.trim(),
      descripcion: fv.descripcion?.trim() || '',
      enlace_url: fv.enlace_url.trim()
    };

    this.evidenceService.registerDoiEvidence(data).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.successMessage.set('Enlace DOI / URL registrado exitosamente.');
        this.evidenceUploaded.emit(res.evidence);
        setTimeout(() => this.closeModal(), 1200);
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        const detail = err?.error?.enlace_url?.[0] || err?.error?.mensaje || 'Error al registrar el DOI o enlace.';
        this.errorMessage.set(detail);
      }
    });

  }

  closeModal(): void {
    this.isOpen.set(false);
    this.closed.emit();
    this.selectedFile.set(null);
    this.fileForm.reset({
      titulo: '',
      actividad_tipo: this.defaultActivityType() || 'OTRO',
      actividad_id: this.defaultActivityId() || null,
      descripcion: ''
    });
    this.doiForm.reset({
      titulo: '',
      actividad_tipo: this.defaultActivityType() || 'OTRO',
      actividad_id: this.defaultActivityId() || null,
      enlace_url: '',
      descripcion: ''
    });
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}
