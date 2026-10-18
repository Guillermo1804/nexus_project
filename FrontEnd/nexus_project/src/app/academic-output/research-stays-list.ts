import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';

@Component({
  selector: 'app-research-stays-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    if (!confirm(`¿Estás seguro de eliminar la estancia en ${stay.institucion_destino}?`)) {
      return;
    }
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
}
