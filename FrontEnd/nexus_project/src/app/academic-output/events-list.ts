import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AcademicService } from '../core/academic/academic.service';
import { AcademicEvent, PaginatedResponse } from '../core/academic/academic.models';
import { ToastService } from '../shared/toast.service';
import { ConfirmDialogComponent, ConfirmRequest } from '../shared/confirm-dialog.component';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-events-list',
  imports: [CommonModule, DatePipe, RouterLink, ConfirmDialogComponent],
  templateUrl: './events-list.html',
  styleUrls: ['./events-list.scss']
})
export class EventsListComponent implements OnInit {
  events: AcademicEvent[] = [];
  studentId = 0;
  loading = false;
  readonly auth: AuthService;
  pendingDelete: AcademicEvent | null = null;
  readonly deleteRequest: ConfirmRequest = {
    title: 'Eliminar congreso',
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
    this.loadEvents();
  }

  loadEvents(): void {
    if (this.studentId > 0) {
      this.loading = true;
      this.academicService.getEvents(this.studentId).subscribe({
        next: (data: PaginatedResponse<AcademicEvent>) => {
          this.events = data.results;
          this.loading = false;
        },
        error: (err: unknown) => {
          console.error('Error al cargar los eventos', err);
          this.loading = false;
        }
      });
    }
  }

  newEvent(): void {
    this.router.navigate(['/students', this.studentId, 'academic-output', 'events', 'new']);
  }

  editEvent(event: AcademicEvent): void {
    this.router.navigate(['/students', this.studentId, 'academic-output', 'events', 'edit', event.id]);
  }

  deleteEvent(event: AcademicEvent): void {
    this.pendingDelete = event;
    this.deleteRequest.message = `¿Está seguro de eliminar el evento "${event.titulo_trabajo}"?`;
  }

  confirmDelete(): void {
    const event = this.pendingDelete;
    if (!event) return;

    this.pendingDelete = null;
    this.academicService.deleteEvent(event.id).subscribe({
      next: () => {
        this.toastService.exito('Evento eliminado exitosamente');
        this.loadEvents();
      },
      error: (err) => {
        this.toastService.error('Error al eliminar el evento');
        console.error(err);
      }
    });
  }

  cancelDelete(): void {
    this.pendingDelete = null;
  }

  getTypeClass(tipo: string): string {
    switch (tipo) {
      case 'CONGRESO': return 'type-congreso';
      case 'COLOQUIO': return 'type-coloquio';
      case 'SIMPOSIO': return 'type-simposio';
      default: return '';
    }
  }

  getTypeLabel(tipo: string): string {
    switch (tipo) {
      case 'CONGRESO': return 'Congreso';
      case 'COLOQUIO': return 'Coloquio';
      case 'SIMPOSIO': return 'Simposio';
      default: return tipo;
    }
  }

  getRoleLabel(rol: string): string {
    switch (rol) {
      case 'PONENTE': return 'Ponente';
      case 'ASISTENTE': return 'Asistente';
      default: return rol;
    }
  }

  getModalityLabel(mod: string): string {
    switch (mod) {
      case 'PRESENCIAL': return 'Presencial';
      case 'VIRTUAL': return 'Virtual';
      case 'HIBRIDA': return 'Híbrida';
      default: return mod;
    }
  }
}