import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Agreement, AgreementStatus } from '../../../core/models/agreement.model';
import { AgreementService } from '../../../core/services/agreement.service';
import { StudentService } from '../../../core/services/student.service';
import { PeriodService } from '../../../core/services/period.service';
import { Student } from '../../../core/models/student.model';
import { PillBadgeComponent } from '../../../shared/components/pill-badge/pill-badge.component';
import { AgreementDrawerComponent } from '../agreement-drawer/agreement-drawer.component';

export type StatusFilterOption = 'TODOS' | AgreementStatus;

@Component({
  selector: 'app-agreements-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PillBadgeComponent, AgreementDrawerComponent],
  templateUrl: './agreements-list.component.html',
  styleUrls: ['./agreements-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgreementsListComponent implements OnInit {
  private agreementService = inject(AgreementService);
  private studentService = inject(StudentService);
  readonly periodService = inject(PeriodService);

  // State Signals
  readonly rawAgreements = signal<Agreement[]>([]);
  readonly studentsList = signal<Student[]>([]);
  readonly isLoading = signal<boolean>(true);

  // Filter Signals
  readonly selectedStatusFilter = signal<StatusFilterOption>('TODOS');
  readonly searchTerm = signal<string>('');
  readonly selectedStudentId = signal<number | 'ALL'>('ALL');
  readonly selectedSemester = signal<number | 'ALL'>('ALL');

  // Drawer Control Signals
  readonly isDrawerOpen = signal<boolean>(false);
  readonly drawerMode = signal<'CREATE' | 'STATUS_UPDATE'>('CREATE');
  readonly selectedAgreement = signal<Agreement | null>(null);

  // Filtered base agreements according to selected academic period
  readonly periodAgreements = computed(() => {
    let list = this.rawAgreements();
    const period = this.periodService.activePeriod();
    if (period !== 'TODOS') {
      const cohortStudents = this.studentsList().filter(
        s => (s.cohorte === period || s.cohort === period)
      ).map(s => s.id);
      if (cohortStudents.length > 0) {
        list = list.filter(a => cohortStudents.includes(a.studentId || a.student || 0));
      }
    }
    return list;
  });

  // Filtered list computed signal
  readonly filteredAgreements = computed(() => {
    let list = this.periodAgreements();
    const status = this.selectedStatusFilter();
    const query = this.searchTerm().trim().toLowerCase();
    const sId = this.selectedStudentId();
    const sem = this.selectedSemester();

    if (status !== 'TODOS') {
      list = list.filter(a => a.status === status || a.estado === status);
    }

    if (sId !== 'ALL') {
      list = list.filter(a => (a.studentId === Number(sId) || a.student === Number(sId)));
    }

    if (sem !== 'ALL') {
      list = list.filter(a => a.semesterNumber === Number(sem) || (a as any).semester_numero === Number(sem));
    }

    if (query) {
      list = list.filter(a => 
        (a.title || a.descripcion || '').toLowerCase().includes(query) ||
        (a.description || a.descripcion || '').toLowerCase().includes(query) ||
        (a.responsibleName || a.responsable_nombre || '').toLowerCase().includes(query) ||
        (a.studentName || a.student_nombre || '').toLowerCase().includes(query) ||
        (a.studentMatricula || a.student_matricula || '').toLowerCase().includes(query)
      );
    }

    return list;
  });

  // Summary Metrics Signals
  readonly totalCount = computed(() => this.periodAgreements().length);
  readonly pendingCount = computed(() => this.periodAgreements().filter(a => a.status === 'PENDIENTE' || a.estado === 'PENDIENTE').length);
  readonly inProgressCount = computed(() => this.periodAgreements().filter(a => a.status === 'EN_PROCESO' || a.estado === 'EN_PROCESO').length);
  readonly concludedCount = computed(() => this.periodAgreements().filter(a => a.status === 'CONCLUIDO' || a.estado === 'CONCLUIDO').length);
  readonly overdueCount = computed(() => this.periodAgreements().filter(a => a.status === 'VENCIDO' || a.estado === 'VENCIDO' || a.isOverdue || a.is_vencido).length);

  readonly pendingPercentage = computed(() => {
    const total = this.totalCount();
    return total > 0 ? Math.round((this.pendingCount() / total) * 100) : 0;
  });
  readonly inProgressPercentage = computed(() => {
    const total = this.totalCount();
    return total > 0 ? Math.round((this.inProgressCount() / total) * 100) : 0;
  });
  readonly concludedPercentage = computed(() => {
    const total = this.totalCount();
    return total > 0 ? Math.round((this.concludedCount() / total) * 100) : 0;
  });
  readonly overduePercentage = computed(() => {
    const total = this.totalCount();
    return total > 0 ? Math.round((this.overdueCount() / total) * 100) : 0;
  });

  // Active filter chips detection
  readonly activeFiltersCount = computed(() => {
    let count = 0;
    if (this.selectedStatusFilter() !== 'TODOS') count++;
    if (this.searchTerm().trim().length > 0) count++;
    if (this.selectedStudentId() !== 'ALL') count++;
    if (this.selectedSemester() !== 'ALL') count++;
    return count;
  });

  readonly selectedStudentName = computed(() => {
    const sId = this.selectedStudentId();
    if (sId === 'ALL') return null;
    const found = this.studentsList().find(s => s.id === Number(sId));
    return found ? found.nombre_completo || found.user?.fullName : `Estudiante #${sId}`;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    this.studentService.getStudents().subscribe(res => {
      this.studentsList.set(res.results || []);
    });

    this.agreementService.getAgreements().subscribe(agreements => {
      this.rawAgreements.set(agreements);
      this.isLoading.set(false);
    });
  }

  // Filter Actions
  setStatusFilter(status: StatusFilterOption): void {
    this.selectedStatusFilter.set(status);
  }

  onSearchChange(text: string): void {
    this.searchTerm.set(text);
  }

  onStudentChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const val = select.value;
    this.selectedStudentId.set(val === 'ALL' ? 'ALL' : Number(val));
  }

  onSemesterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const val = select.value;
    this.selectedSemester.set(val === 'ALL' ? 'ALL' : Number(val));
  }

  removeStatusFilter(): void {
    this.selectedStatusFilter.set('TODOS');
  }

  removeSearchFilter(): void {
    this.searchTerm.set('');
  }

  removeStudentFilter(): void {
    this.selectedStudentId.set('ALL');
  }

  removeSemesterFilter(): void {
    this.selectedSemester.set('ALL');
  }

  clearAllFilters(): void {
    this.selectedStatusFilter.set('TODOS');
    this.searchTerm.set('');
    this.selectedStudentId.set('ALL');
    this.selectedSemester.set('ALL');
  }

  // Drawer Control Actions
  openCreateDrawer(): void {
    this.drawerMode.set('CREATE');
    this.selectedAgreement.set(null);
    this.isDrawerOpen.set(true);
  }

  openUpdateStatusDrawer(agreement: Agreement): void {
    this.drawerMode.set('STATUS_UPDATE');
    this.selectedAgreement.set(agreement);
    this.isDrawerOpen.set(true);
  }

  onDrawerClosed(): void {
    this.isDrawerOpen.set(false);
    this.selectedAgreement.set(null);
  }

  onAgreementSaved(savedAgr: Agreement): void {
    if (this.drawerMode() === 'CREATE') {
      this.rawAgreements.update(list => [savedAgr, ...list]);
    } else {
      this.rawAgreements.update(list => list.map(a => a.id === savedAgr.id ? savedAgr : a));
    }
  }

  getInitials(name?: string): string {
    if (!name) return 'EX';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  isDeadlineUrgent(dueDate?: string, status?: AgreementStatus): boolean {
    if (!dueDate || status === 'CONCLUIDO' || status === 'VENCIDO') return false;
    const now = new Date().getTime();
    const target = new Date(dueDate).getTime();
    const diffDays = (target - now) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  }
}
