import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MonitoringService, StudentDossier } from '../core/monitoring/monitoring.service';

@Component({
  selector: 'app-student-dossier-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './student-dossier-view.html',
  styleUrls: ['./student-dossier-view.scss'],
})
export class StudentDossierViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly monitoring = inject(MonitoringService);

  protected dossier: StudentDossier | null = null;
  protected loading = true;
  protected error = '';

  ngOnInit(): void {
    const studentId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(studentId) || studentId <= 0) {
      this.error = 'El estudiante indicado no es válido.';
      this.loading = false;
      return;
    }
    this.monitoring.getDossier(studentId).subscribe({
      next: dossier => {
        this.dossier = dossier;
        this.loading = false;
      },
      error: error => {
        this.error = error.status === 403
          ? 'No tiene permisos para consultar este reporte.'
          : 'No fue posible generar el reporte integral.';
        this.loading = false;
      },
    });
  }

  protected print(): void {
    window.print();
  }

  protected formatDate(value: unknown): string {
    if (!value) return '—';
    return String(value).slice(0, 10);
  }

  protected text(value: unknown): string {
    return value === null || value === undefined || value === '' ? '—' : String(value);
  }
}
