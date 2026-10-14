import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
<<<<<<< HEAD
<<<<<<< HEAD
import { ActivatedRoute, Router } from '@angular/router';
import { AcademicService } from '../core/academic/academic.service';
import { Publication, PaginatedResponse } from '../core/academic/academic.models';
import { ToastService } from '../shared/toast.service';
=======
import { ActivatedRoute } from '@angular/router';
import { AcademicService } from '../core/academic/academic.service';
import { Publication, PaginatedResponse } from '../core/academic/academic.models';
>>>>>>> 4c0af6e82979033c1688eb503960a299550db69f
=======
import { ActivatedRoute } from '@angular/router';
import { AcademicService } from '../core/academic/academic.service';
import { Publication, PaginatedResponse } from '../core/academic/academic.models';
>>>>>>> 4c0af6e82979033c1688eb503960a299550db69f

@Component({
  selector: 'app-publications-list',
  imports: [CommonModule, DatePipe],
  templateUrl: './publications-list.html',
  styleUrls: ['./publications-list.scss']
})
export class PublicationsListComponent implements OnInit {
  publications: Publication[] = [];
  studentId = 0;
<<<<<<< HEAD
<<<<<<< HEAD
  loading = false;

  constructor(
    private academicService: AcademicService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const studentIdParam = this.route.snapshot.paramMap.get('id');
=======
=======
>>>>>>> 4c0af6e82979033c1688eb503960a299550db69f

  constructor(
    private academicService: AcademicService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const studentIdParam = this.route.snapshot.paramMap.get('studentId');
<<<<<<< HEAD
>>>>>>> 4c0af6e82979033c1688eb503960a299550db69f
=======
>>>>>>> 4c0af6e82979033c1688eb503960a299550db69f
    if (studentIdParam) {
      this.studentId = +studentIdParam;
    }
    this.loadPublications();
  }

  loadPublications(): void {
    if (this.studentId > 0) {
<<<<<<< HEAD
<<<<<<< HEAD
      this.loading = true;
      this.academicService.getPublications(this.studentId).subscribe({
        next: (data: PaginatedResponse<Publication>) => {
          this.publications = data.results;
          this.loading = false;
        },
        error: (err: unknown) => {
          console.error('Error al cargar las publicaciones', err);
          this.loading = false;
=======
=======
>>>>>>> 4c0af6e82979033c1688eb503960a299550db69f
      this.academicService.getPublications(this.studentId).subscribe({
        next: (data: PaginatedResponse<Publication>) => {
          this.publications = data.results;
        },
        error: (err: unknown) => {
          console.error('Error al cargar las publicaciones', err);
<<<<<<< HEAD
>>>>>>> 4c0af6e82979033c1688eb503960a299550db69f
=======
>>>>>>> 4c0af6e82979033c1688eb503960a299550db69f
        }
      });
    }
  }
<<<<<<< HEAD
<<<<<<< HEAD

  editPublication(publication: Publication): void {
    this.router.navigate(['/students', this.studentId, 'academic-output', 'edit', publication.id]);
  }

  deletePublication(publication: Publication): void {
    if (confirm(`¿Está seguro de eliminar la publicación "${publication.titulo}"?`)) {
      this.academicService.deletePublication(publication.id).subscribe({
        next: () => {
          this.toastService.exito('Publicación eliminada exitosamente');
          this.loadPublications();
        },
        error: (err) => {
          this.toastService.error('Error al eliminar la publicación');
          console.error(err);
        }
      });
    }
  }

  getStatusClass(estado: string): string {
    switch (estado) {
      case 'PREPARACION': return 'status-preparacion';
      case 'ENVIADO': return 'status-enviado';
      case 'EN_REVISION': return 'status-en-revision';
      case 'ACEPTADO': return 'status-aceptado';
      case 'PUBLICADO': return 'status-publicado';
      default: return '';
    }
  }

  getStatusLabel(estado: string): string {
    switch (estado) {
      case 'PREPARACION': return 'Preparación';
      case 'ENVIADO': return 'Enviado';
      case 'EN_REVISION': return 'En Revisión';
      case 'ACEPTADO': return 'Aceptado';
      case 'PUBLICADO': return 'Publicado';
      default: return estado;
    }
  }

  newPublication(): void {
    this.router.navigate(['/students', this.studentId, 'academic-output', 'new']);
  }
=======
>>>>>>> 4c0af6e82979033c1688eb503960a299550db69f
=======
>>>>>>> 4c0af6e82979033c1688eb503960a299550db69f
}