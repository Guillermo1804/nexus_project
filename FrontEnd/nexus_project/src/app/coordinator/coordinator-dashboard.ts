import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MonitoringService, DashboardResponse, DistribucionAvanceTesis, DistribucionSemestre } from '../core/monitoring/monitoring.service';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { EstudiantesActivosModalComponent } from './estudiantes-activos-modal';
import { TutoriasPeriodoModalComponent } from './tutorias-periodo-modal';
import { AcuerdosSegumientoModalComponent } from './acuerdos-seguimiento-modal';
import { AcuerdosVencidosModalComponent } from './acuerdos-vencidos-modal';

@Component({
  selector: 'app-coordinator-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatDialogModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatListModule,
    MatChipsModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    MatPaginatorModule,
    MatSortModule
  ],
  templateUrl: './coordinator-dashboard.html',
  styleUrls: ['./coordinator-dashboard.scss'],
})
export class CoordinatorDashboardComponent implements OnInit {
  private readonly monitoringService = inject(MonitoringService);
  private readonly dialog = inject(MatDialog);

  protected loading = true;
  protected error = '';
  protected data: DashboardResponse | null = null;

  private readonly SEMESTRE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  private readonly DONUT_RADIUS = 80;
  private readonly DONUT_CIRCUMFERENCE = 2 * Math.PI * this.DONUT_RADIUS;

  ngOnInit(): void {
    this.loadDashboard();
  }

  protected loadDashboard(): void {
    this.loading = true;
    this.error = '';
    this.monitoringService.getDashboard().subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.status === 403
          ? 'No tiene permisos para acceder a este panel.'
          : 'No fue posible cargar el dashboard.';
        this.loading = false;
      },
    });
  }

  protected getAvanceRanges(): { label: string; value: number; color: string }[] {
    if (!this.data) return [];
    const d = this.data.distribucion_avance_tesis;
    return [
      { label: '0-25%', value: d.rango_0_25, color: '#ef4444' },
      { label: '26-50%', value: d.rango_26_50, color: '#f97316' },
      { label: '51-75%', value: d.rango_51_75, color: '#eab308' },
      { label: '76-100%', value: d.rango_76_100, color: '#22c55e' },
    ];
  }

  protected getTotalAvance(): number {
    if (!this.data) return 0;
    const d = this.data.distribucion_avance_tesis;
    return d.rango_0_25 + d.rango_26_50 + d.rango_51_75 + d.rango_76_100;
  }

  protected getBarHeight(value: number, total: number): number {
    if (total === 0) return 0;
    return (value / total) * 100;
  }

  protected getTotalSemestres(): number {
    if (!this.data?.distribucion_semestres) return 0;
    return this.data.distribucion_semestres.reduce((sum, item) => sum + item.total_alumnos, 0);
  }

  protected getSemestreColor(index: number): string {
    return this.SEMESTRE_COLORS[index % this.SEMESTRE_COLORS.length];
  }

  protected getCircumference(value: number, total: number): string {
    if (total === 0) return '0';
    const ratio = value / total;
    return (ratio * this.DONUT_CIRCUMFERENCE).toFixed(2);
  }

  protected getStrokeDashoffset(item: DistribucionSemestre, index: number): string {
    const total = this.getTotalSemestres();
    if (total === 0) return '0';
    let cumulative = 0;
    for (let i = 0; i < index; i++) {
      cumulative += this.data!.distribucion_semestres[i].total_alumnos;
    }
    const offset = (cumulative / total) * this.DONUT_CIRCUMFERENCE;
    const remaining = this.DONUT_CIRCUMFERENCE - offset;
    return remaining.toFixed(2);
  }

  protected getSemestreAriaLabel(): string {
    if (!this.data) return 'Distribución de estudiantes por semestre';
    const total = this.getTotalSemestres();
    return `Gráfico de dona mostrando distribución de ${total} estudiantes por semestre`;
  }

  protected getAvanceAriaLabel(): string {
    if (!this.data) return 'Distribución de avance de tesis';
    const total = this.getTotalAvance();
    return `Gráfico de barras mostrando avance de tesis de ${total} estudiantes en 4 rangos de progreso`;
  }

  protected openEstudiantesActivosModal(): void {
    if (!this.data) return;
    this.dialog.open(EstudiantesActivosModalComponent, {
      data: { estudiantes: this.data.estudiantes_activos || [] },
      width: '90%',
      maxHeight: '90vh',
    });
  }

  protected openTutoriasPeriodoModal(): void {
    if (!this.data) return;
    this.dialog.open(TutoriasPeriodoModalComponent, {
      data: { tutorias: this.data.tutorias_periodo || [] },
      width: '90%',
      maxHeight: '90vh',
    });
  }

  protected openAcuerdosSegumientoModal(): void {
    if (!this.data) return;
    this.dialog.open(AcuerdosSegumientoModalComponent, {
      data: { acuerdos: this.data.acuerdos_segumiento || [] },
      width: '90%',
      maxHeight: '90vh',
    });
  }

  protected openAcuerdosVencidosModal(): void {
    if (!this.data) return;
    this.dialog.open(AcuerdosVencidosModalComponent, {
      data: { acuerdos: this.data.acuerdos_vencidos || [] },
      width: '90%',
      maxHeight: '90vh',
    });
  }
}