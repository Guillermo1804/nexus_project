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