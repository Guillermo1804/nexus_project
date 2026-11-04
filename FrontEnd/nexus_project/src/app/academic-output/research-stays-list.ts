import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { ConfirmDialogComponent, ConfirmRequest } from '../shared/confirm-dialog.component';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-research-stays-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ConfirmDialogComponent],
  templateUrl: './research-stays-list.html',
  styleUrl: './research-stays-list.scss',
})
export class ResearchStaysListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(AcademicService);
  protected studentId = 0;
  protected stays: any[] = [];
  protected loading = false;
  protected error = '';
  protected showForm = false;
  private readonly auth = inject(AuthService);
  protected pendingDelete: any = null;
  protected readonly deleteRequest: ConfirmRequest = {
    title: 'Eliminar estancia',
    message: '',
    warning: 'Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
    tone: 'danger',
  };

  protected get canManage(): boolean {
    return this.auth.user?.role === 'STUDENT' && this.auth.user.student_id === this.studentId;
  }

  ngOnInit(): void {
    this.studentId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load() {
    this.loading = true; this.error = '';
    this.service.getResearchStays(this.studentId).pipe(finalize(() => this.loading = false)).subscribe({
      next: (data: any) => this.stays = data.results || data,
      error: err => this.error = 'No fue posible cargar las estancias.',
    });
  }

  newStay() { this.router.navigate(['/students', this.studentId, 'academic-output', 'research-stays', 'new']); }
  editStay(stay: any) { this.router.navigate(['/students', this.studentId, 'academic-output', 'research-stays', 'edit', stay.id]); }

  deleteStay(stay: any) {
    this.pendingDelete = stay;
    this.deleteRequest.message = `¿Estás seguro de eliminar la estancia en ${stay.institucion_destino}?`;
  }

  confirmDelete() {
    const stay = this.pendingDelete;
    if (!stay) return;

    this.pendingDelete = null;
    this.loading = true;
    this.service.deleteResearchStay(stay.id).pipe(finalize(() => this.loading = false)).subscribe({
      next: () => {
        this.stays = this.stays.filter(s => s.id !== stay.id);
      },
      error: () => {
        this.error = 'No fue posible eliminar la estancia.';
      },
    });
  }

  cancelDelete() {
    this.pendingDelete = null;
  }
}
