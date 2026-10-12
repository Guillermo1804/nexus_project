import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AcademicService } from '../../core/academic/academic.service';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'app-publication-form',
  templateUrl: './publication-form.html',
  styleUrls: ['./publication-form.scss']
})
export class PublicationFormComponent implements OnInit {
  publicationForm: FormGroup;
  studentId: number;
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
    this.studentId = +this.route.snapshot.paramMap.get('studentId');
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
        next: (response) => {
          this.toastService.showSuccess('Publicación registrada exitosamente');
          this.router.navigate(['/students', this.studentId, 'academic-output']);
        },
        error: (err) => {
          this.toastService.showError('Error al registrar la publicación');
          console.error(err);
        }
      });
    }
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    this.publicationForm.patchValue({
      evidencia: file
    });
  }
}