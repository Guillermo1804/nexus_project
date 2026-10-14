<<<<<<< HEAD
import { Component, computed, inject } from '@angular/core';
import { AbstractControl, FormBuilder, Reactive/Form, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink,ActivatedRoute } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { Publication } from '../core/academic/academic.models';
import { ToastService } from '../shared/toast.service';

const DOI_REQUIRED_STATES = new Set(['ACEPTADO', 'PUBLICADO']);

const DOI_OR_EVIDENCE = (control: AbstractControl): ValidationErrors | null => {
  const doi = control.get('doi')?.value;
  const evidencia = control.get('evidencia')?.value;
  if (!doi && !evidencia) {
    return { doiOrEvidence: 'Debe proporcionar DOI o evidencia para un articulo aceptado o publicado.' };
  }
  return null;
};

@Component({
  selector: 'app-publication-form',
  imports: [RouterLink, Reactive/Form],
  templateUrl: './publication-form.html',
  styleUrl: './publication-form.scss',
})
export class PublicationFormComponent {
  protected readonly fb = inject(FormBuilder);
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly service = inject(AcademicService);
  protected readonly toast = inject(ToastService);

  protected readonly studentId = this.route.snapshot.paramMap.get('id');
  protected readonly publicationId = this.route.snapshot.paramMap.get('publicationId');
  protected readonly isEditMode = computed(() => this.publicationId !== null);

  protected readonly form = this.fb.nonNullable.group({
    titulo: ['', Validators.required],
    autores: ['', Validators.required],
    tipo: ['', Validators.required],
    revista: ['', Validators.required],
    estado: ['PREPARACION', Validators.required],
    fecha_publicacion: [''],
    doi: [''],
    evidencia: [null as number | null],
  }, { validators: DOI_OR_EVIDENCE });

  protected saving = false;
  protected selectedFile: File | null = null;
  protected uploadedEvidenceId: number | null = null;

  protected readonly publicationTypes = [
    { value: 'JCR', label: 'JCR' },
    { value: 'SCOPUS', label: 'Scopus' },
    { value: 'CONACYT', label: 'Conacyt' },
    { value: 'OTRO_INDEXADO', label: 'Otro Indexado' },
  ];

  protected readonly publicationStatuses = [
    { value: 'PREPARACION', label: 'Preparacion', color: 'gray' },
    { value: 'ENVIADO', label: 'Enviado', color: 'gray' },
    { value: 'EN_REVISION', label: 'En Revision', color: 'amber' },
    { value: 'ACEPTADO', label: 'Aceptado', color: 'green' },
    { value: 'PUBLICADO', label: 'Publicado', color: 'green' },
  ];

  protected readonly maxDate = new Date().toISOString().split('T')[0];

  constructor() {
    this.form.controls.estado.valueChanges.subscribe(estado => {
      const doiControl = this.form.controls.doi;

      if (DOI_REQUIRED_STATES.has(estado)) {
        doiControl.setValidators([Validators.required]);
        doiControl.updateValueAndValidity();
      } else {
        doiControl.clearValidators();
        doiControl.updateValueAndValidity();
      }
    });

    if (this.publicationId) {
      this.loadPublication();
    }
  }

  protected onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;

    let evidenciaId: number | null = null;
    if (this.selectedFile && this.studentId) {
      try {
        const overview = await firstValueFrom(this.service.getStudentOverview(Number(this.studentId)));
        const semesterId = overview.current_semester?.id ?? overview.semesters[0]?.id ?? null;
        const evidence = await firstValueFrom(this.service.uploadPublicationEvidence(Number(this.studentId), semesterId, this.selectedFile));
        evidenciaId = evidence.id;
        this.uploadedEvidenceId = evidenciaId;
      } catch (err) {
        this.toast.error('Error al subir la evidencia');
        console.error(err);
        this.saving = false;
        return;
      }
    }

    const payload = this.form.getRawValue() as Partial<Publication>;
    if (evidenciaId) {
      payload.evidencia = evidenciaId;
    } else if (this.uploadedEvidenceId) {
      payload.evidencia = this.uploadedEvidenceId;
    }

    const request = this.publicationId
      ? this.service.updatePublication(Number(this.publicationId), payload)
      : this.service.createPublication(Number(this.studentId), payload);

    request.pipe(finalize(() => this.saving = false)).subscribe({
      next: () => {
        this.toast.exito(this.publicationId ? 'Publicación actualizada exitosamente' : 'Publicación registrada exitosamente');
        this.router.navigate(['/students', this.studentId, 'academic-output']);
      },
      error: (err) => {
        this.toast.error(this.publicationId ? 'Error al actualizar la publicacion' : 'Error al registrar la publicacion');
        console.error(err);
      },
    });
  }

  protected cancelar(): void {
    this.router.navigate(['/students', this.studentId, 'academic-output']);
  }

  private loadPublication(): void {
    if (!this.publicationId) return;
    this.saving = true;
    this.service.getPublications(Number(this.studentId)).pipe(finalize(() => this.saving = false)).subscribe({
      next: (data) => {
        const publication = data.results.find(p => p.id === Number(this.publicationId));
        if (publication) {
          this.form.patchValue({
            titulo: publication.titulo,
            autores: publication.autores,
            tipo: publication.tipo,
            revista: publication.revista,
            estado: publication.estado,
            fecha_publicacion: publication.fecha_publicacion ? publication.fecha_publicacion.split('T')[0] : '',
            doi: publication.doi,
            evidencia: publication.evidencia,
          });
          this.uploadedEvidenceId = publication.evidencia;
        }
      },
      error: (err) => {
        this.toast.error('Error al cargar la publicacion');
        console.error(err);
      },
    });
  }
}


=======
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AcademicService } from '../core/academic/academic.service';
import { ToastService } from '../shared/toast.service';

@Component({
  selector: 'app-publication-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './publication-form.html',
  styleUrls: ['./publication-form.scss']
})
export class PublicationFormComponent implements OnInit {
  publicationForm!: FormGroup;
  studentId = 0;
  publicationTypes = [
    { value: 'JCR', label: 'JCR' },
    { value: 'SCOPUS', label: 'Scopus' },
    { value: 'CONACYT', label: 'Conacyt' },
    { value: 'OTRO_INDEXADO', label: 'Otro Indexado' }
  ];
  publicationStatuses = [
    { value: 'PREPARACION', label: 'Preparación', color: 'gray' },
    { value: 'ENVIADO', label: 'Enviado', color: 'gray' },
    { value: 'EN_REVISION', label: 'En Revisión', color: 'amber' },
    { value: 'ACEPTADO', label: 'Aceptado', color: 'green' },
    { value: 'PUBLICADO', label: 'Publicado', color: 'green' }
  ];

  constructor(
    private fb: FormBuilder,
    private academicService: AcademicService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const studentIdParam = this.route.snapshot.paramMap.get('studentId');
    if (studentIdParam) {
      this.studentId = +studentIdParam;
    }
    this.initializeForm();
  }

  initializeForm(): void {
    this.publicationForm = this.fb.group({
      titulo: ['', Validators.required],
      autores: ['', Validators.required],
      tipo: ['', Validators.required],
      revista: ['', Validators.required],
      estado: ['PREPARACION', Validators.required],
      fecha_publicacion: [''],
      doi: [''],
      evidencia: [null]
    });
  }

  onSubmit(): void {
    if (this.publicationForm.valid) {
      const formData = this.publicationForm.value;
      this.academicService.createPublication(this.studentId, formData).subscribe({
        next: (response: unknown) => {
          this.toastService.exito('Publicación registrada exitosamente');
          this.router.navigate(['/students', this.studentId, 'academic-output']);
        },
        error: (err: unknown) => {
          this.toastService.error('Error al registrar la publicación');
          console.error(err);
        }
      });
    }
  }

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      this.publicationForm.patchValue({
        evidencia: file
      });
    }
  }
}
>>>>>>> 4c0af6e82979033c1688eb503960a299550db69f
