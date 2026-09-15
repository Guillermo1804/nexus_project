import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { AcademicService } from '../core/academic/academic.service';
import { StudentService } from '../core/students/student.service';
import { StudentRecord } from '../core/academic/academic.models';
import { AcademicCommitteeCardComponent } from '../students/academic-committee-card.component';
import { formatWelcomeGreeting } from '../shared/presentation/grammatical-copy';
import { getRoleLabelByGender } from '../shared/presentation/role-labels';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink, AcademicCommitteeCardComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly academicService = inject(AcademicService);
  protected readonly studentService = inject(StudentService);
  private readonly router = inject(Router);
  protected isLeaving = false;
  protected estudiantes: StudentRecord[] = [];
  protected cargandoEstudiantes = false;
  protected errorEstudiantes = '';
  protected paginaEstudiantes = 1;
  protected totalEstudiantes = 0;
  protected siguientePagina = false;

  getWelcomeText(): string {
    const user = this.auth.user();
    return formatWelcomeGreeting(
      user?.first_name || user?.email,
      user?.grammatical_gender,
    );
  }

  getRoleLabel(role?: string): string {
    return getRoleLabelByGender(role, this.auth.user()?.grammatical_gender);
  }

  ngOnInit(): void {
    if (this.auth.hasPermission('academic.read.global')) {
      this.cargarEstudiantes();
    }
    const role = this.auth.user()?.role;
    if (role === 'TUTOR' || role === 'COMMITTEE_MEMBER' || this.auth.hasPermission('records.read.assigned')) {
      this.studentService.loadStudents();
    }
  }

  cargarEstudiantes(page = 1): void {
    this.cargandoEstudiantes = true;
    this.errorEstudiantes = '';
    this.academicService
      .getGlobalOverview(page)
      .pipe(finalize(() => (this.cargandoEstudiantes = false)))
      .subscribe({
        next: (data) => {
          this.estudiantes = data.results;
          this.totalEstudiantes = data.count;
          this.paginaEstudiantes = page;
          this.siguientePagina = data.next !== null;
        },
        error: () => {
          this.estudiantes = [];
          this.errorEstudiantes = 'No fue posible cargar el padrón de estudiantes.';
        },
      });
  }

  logout(): void {
    if (this.isLeaving) return;
    this.isLeaving = true;
    this.auth
      .logout()
      .pipe(
        finalize(() => {
          this.auth.clearSession();
          void this.router.navigate(['/login']);
        })
      )
      .subscribe({ error: () => undefined });
  }
}
