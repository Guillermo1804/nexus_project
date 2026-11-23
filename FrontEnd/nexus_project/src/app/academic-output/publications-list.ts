import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AcademicService } from '../core/academic/academic.service';
import { Publication, PaginatedResponse, OtherProduct } from '../core/academic/academic.models';
import { ToastService } from '../shared/toast.service';
import { ConfirmDialogComponent, ConfirmRequest } from '../shared/confirm-dialog.component';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-publications-list',
  imports: [CommonModule, DatePipe, RouterLink, ConfirmDialogComponent],
  templateUrl: './publications-list.html',
  styleUrls: ['./publications-list.scss']
})
export class PublicationsListComponent implements OnInit {
  publications: Publication[] = [];
  studentId = 0;
  loading = false;
  readonly auth: AuthService;
  pendingDelete: Publication | null = null;
  readonly deleteRequest: ConfirmRequest = {
    title: 'Eliminar publicación',
    message: '',
    warning: 'Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
    tone: 'danger',
  };

  constructor(
    private academicService: AcademicService,
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService,
    auth: AuthService
  ) { this.auth = auth; }

  get canManage(): boolean {
    return this.auth.user?.role === 'STUDENT' && this.auth.user.student_id === this.studentId;
  }

  ngOnInit(): void {
    const studentIdParam = this.route.snapshot.paramMap.get('id');
    if (studentIdParam) {
      this.studentId = +studentIdParam;
    }
    this.loadPublications();
  }

  loadPublications(): void {
    if (this.studentId > 0) {
      this.loading = true;
      this.academicService.getPublications(this.studentId).subscribe({
        next: (data: PaginatedResponse<Publication>) => {
          this.publications = data.results;
          this.loading = false;
        },
        error: (err: unknown) => {
          console.error('Error al cargar las publicaciones', err);
          this.loading = false;
        }
      });
    }
  }

  newPublication(): void {
    this.router.navigate(['/students', this.studentId, 'academic-output', 'new']);
  }

  editPublication(publication: Publication): void {
    this.router.navigate(['/students', this.studentId, 'academic-output', 'edit', publication.id]);
  }

  deletePublication(publication: Publication): void {
    this.pendingDelete = publication;
    this.deleteRequest.message = `¿Está seguro de eliminar la publicación "${publication.titulo}"?`;
  }

  confirmDelete(): void {
    const publication = this.pendingDelete;
    if (!publication) return;

    this.pendingDelete = null;
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

  cancelDelete(): void {
    this.pendingDelete = null;
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
}