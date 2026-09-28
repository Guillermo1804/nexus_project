import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { AgreementAlertsResponse, StudentRecord, TutoringSession } from '../core/academic/academic.models';
import { AuthService } from '../core/auth/auth.service';
import { StudentService } from '../core/students/student.service';
import { PaginatedResponse } from '../shared/pagination';
import { formatWelcomeGreeting } from '../shared/presentation/grammatical-copy';
import { getRoleLabelByGender } from '../shared/presentation/role-labels';

interface CohortSummary {
  name: string;
  count: number;
  percentage: number;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly studentService = inject(StudentService);
  private readonly academicService = inject(AcademicService);

  protected students: StudentRecord[] = [];
  protected tutoringSessions: TutoringSession[] = [];
  protected totalTutoringSessions = 0;
  protected pendingAgreements = 0;
  protected inProgressAgreements = 0;
  protected overdueAgreements = 0;
  protected loadingDashboard = false;
  protected dashboardError = '';
  protected agreementAlerts: AgreementAlertsResponse | null = null;
  protected alertsDismissed = false;

  protected programFilter = '';
  protected cohortFilter = '';
  protected statusFilter = 'all';
  protected searchFilter = '';
  protected studentPage = 1;
  protected readonly pageSize = 10;

  ngOnInit(): void {
    this.academicService.getAgreementAlerts().subscribe({
      next: response => this.agreementAlerts = response,
      error: () => this.agreementAlerts = null,
    });
    if (this.auth.hasPermission('academic.read.global')) {
      this.loadDashboard();
      return;
    }

    const role = this.auth.user()?.role;
    if (role === 'TUTOR' || role === 'COMMITTEE_MEMBER' || this.auth.hasPermission('records.read.assigned')) {
      this.studentService.loadStudents();
    }
  }

  protected dismissAlerts(): void {
    this.alertsDismissed = true;
  }

  protected getWelcomeText(): string {
    const user = this.auth.user();
    return formatWelcomeGreeting(user?.first_name || user?.email, user?.grammatical_gender);
  }

  protected getRoleLabel(role?: string): string {
    return getRoleLabelByGender(role, this.auth.user()?.grammatical_gender);
  }

  protected loadDashboard(): void {
    this.loadingDashboard = true;
    this.dashboardError = '';

    forkJoin({
      students: this.loadStudentPages(),
      sessions: this.academicService.getTutoringSessions(1),
      pending: this.academicService.getAgreements({ estado: 'PENDIENTE' }),
      inProgress: this.academicService.getAgreements({ estado: 'EN_PROCESO' }),
      overdue: this.academicService.getAgreements({ vencido: true }),
    }).subscribe({
      next: ({ students, sessions, pending, inProgress, overdue }) => {
        this.students = students;
        this.tutoringSessions = sessions.results;
        this.totalTutoringSessions = sessions.count;
        this.pendingAgreements = pending.count;
        this.inProgressAgreements = inProgress.count;
        this.overdueAgreements = overdue.count;
        this.loadingDashboard = false;
        this.clampStudentPage();
      },
      error: () => {
        this.dashboardError = 'No fue posible cargar el dashboard institucional.';
        this.loadingDashboard = false;
      },
    });
  }

  private loadStudentPages(page = 1, accumulated: StudentRecord[] = []): Observable<StudentRecord[]> {
    return this.academicService.getGlobalOverview(page).pipe(
      switchMap(response => {
        const students = [...accumulated, ...response.results];
        return response.next && page < 5 ? this.loadStudentPages(page + 1, students) : of(students);
      }),
    );
  }

  protected get activeStudents(): number {
    return this.students.filter(student => student.estatus_activo).length;
  }

  protected get agreementsInFollowUp(): number {
    return this.pendingAgreements + this.inProgressAgreements;
  }

  protected get upcomingSessions(): TutoringSession[] {
    const now = Date.now();
    return this.tutoringSessions
      .filter(session => session.proxima_reunion_fecha && new Date(session.proxima_reunion_fecha).getTime() > now)
      .sort((a, b) => new Date(a.proxima_reunion_fecha!).getTime() - new Date(b.proxima_reunion_fecha!).getTime())
      .slice(0, 5);
  }

  protected studentName(studentId: number): string {
    return this.students.find(student => student.id === studentId)?.nombre_completo ?? 'Estudiante';
  }

  protected get cohortSummary(): CohortSummary[] {
    const cohorts = new Map<string, number>();
    for (const student of this.students) {
      const cohort = student.cohorte || 'Sin cohorte';
      cohorts.set(cohort, (cohorts.get(cohort) ?? 0) + 1);
    }
    const maximum = Math.max(...cohorts.values(), 1);
    return [...cohorts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count, percentage: (count / maximum) * 100 }));
  }

  protected get programs(): string[] {
    return [...new Set(this.students.map(student => student.programa_doctoral).filter(Boolean))].sort();
  }

  protected get cohorts(): string[] {
    return [...new Set(this.students.map(student => student.cohorte).filter(Boolean))].sort();
  }

  protected get filteredStudents(): StudentRecord[] {
    const query = this.searchFilter.trim().toLocaleLowerCase('es');
    return this.students.filter(student => {
      const matchesSearch = !query || `${student.nombre_completo} ${student.matricula}`.toLocaleLowerCase('es').includes(query);
      const matchesProgram = !this.programFilter || student.programa_doctoral === this.programFilter;
      const matchesCohort = !this.cohortFilter || student.cohorte === this.cohortFilter;
      const matchesStatus = this.statusFilter === 'all'
        || (this.statusFilter === 'active' && student.estatus_activo)
        || (this.statusFilter === 'inactive' && !student.estatus_activo);
      return matchesSearch && matchesProgram && matchesCohort && matchesStatus;
    });
  }

  protected get visibleStudents(): StudentRecord[] {
    const start = (this.studentPage - 1) * this.pageSize;
    return this.filteredStudents.slice(start, start + this.pageSize);
  }

  protected get totalStudentPages(): number {
    return Math.max(1, Math.ceil(this.filteredStudents.length / this.pageSize));
  }

  protected get shownFrom(): number {
    return this.filteredStudents.length ? (this.studentPage - 1) * this.pageSize + 1 : 0;
  }

  protected get shownTo(): number {
    return Math.min(this.studentPage * this.pageSize, this.filteredStudents.length);
  }

  protected filtersChanged(): void {
    this.studentPage = 1;
  }

  protected changeStudentPage(page: number): void {
    this.studentPage = Math.min(Math.max(page, 1), this.totalStudentPages);
  }

  private clampStudentPage(): void {
    this.studentPage = Math.min(this.studentPage, this.totalStudentPages);
  }
}
