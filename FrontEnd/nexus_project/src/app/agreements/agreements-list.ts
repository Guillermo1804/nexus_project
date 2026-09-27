import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import {
  Agreement,
  AgreementAuditEntry,
  AgreementFilters,
  Semester,
  StudentRecord,
} from '../core/academic/academic.models';
import { AuthService } from '../core/auth/auth.service';
import { StudentService } from '../core/students/student.service';

interface ResponsableOption {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-agreements-list',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './agreements-list.html',
  styleUrl: './agreements-list.scss',
})
export class AgreementsListComponent implements OnInit {
  private readonly academic = inject(AcademicService);
  private readonly studentsApi = inject(StudentService);
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);

  protected agreements: Agreement[] = [];
  protected students: StudentRecord[] = [];
  protected semesters: Semester[] = [];
  protected responsables: ResponsableOption[] = [];

  protected filtroStudent = '';
  protected filtroSemester = '';
  protected filtroEstado = '';
  protected filtroResponsable = '';
  protected filtroFechaDesde = '';
  protected filtroFechaHasta = '';

  protected pagina = 1;
  protected total = 0;
  protected haySiguiente = false;
  protected cargando = false;
  protected error = '';

  protected auditOpen = false;
  protected auditLoading = false;
  protected auditError = '';
  protected auditEntries: AgreementAuditEntry[] = [];
  protected auditAgreement: Agreement | null = null;

  ngOnInit(): void {
    const queryParams = this.route.snapshot.queryParamMap;
    this.filtroStudent = queryParams.get('student') ?? '';
    this.filtroEstado = queryParams.get('estado') ?? '';
    this.cargarEstudiantes();
    this.cargarAcuerdos();
  }

  protected aplicarFiltros(): void {
    this.pagina = 1;
    this.cargarAcuerdos();
  }

  protected limpiarFiltros(): void {
    this.filtroStudent = '';
    this.filtroSemester = '';
    this.filtroEstado = '';
    this.filtroResponsable = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.semesters = [];
    this.pagina = 1;
    this.cargarAcuerdos();
  }

  protected onStudentChange(): void {
    this.filtroSemester = '';
    this.semesters = [];
    const studentId = Number(this.filtroStudent);
    if (Number.isInteger(studentId) && studentId > 0) {
      this.academic.getStudentSemesters(studentId).subscribe({
        next: (data) => (this.semesters = data),
        error: () => (this.semesters = []),
      });
    }
  }

  protected irPagina(page: number): void {
    if (page < 1) return;
    this.pagina = page;
    this.cargarAcuerdos();
  }

  protected estadoVisible(a: Agreement): string {
    return a.is_vencido && a.estado !== 'CONCLUIDO' ? 'VENCIDO' : a.estado;
  }

  protected badgeClass(a: Agreement): string {
    const estado = this.estadoVisible(a);
    if (estado === 'VENCIDO') return 'badge-overdue';
    if (estado === 'CONCLUIDO') return 'badge-concluded';
    if (estado === 'EN_PROCESO') return 'badge-in-progress';
    return 'badge-pending';
  }

  protected verAuditoria(a: Agreement): void {
    this.auditAgreement = a;
    this.auditOpen = true;
    this.auditLoading = true;
    this.auditError = '';
    this.auditEntries = [];
    this.academic
      .getAgreementAuditLog(a.id)
      .pipe(finalize(() => (this.auditLoading = false)))
      .subscribe({
        next: (entries) => (this.auditEntries = entries),
        error: () => (this.auditError = 'No se pudo cargar la bitácora del acuerdo.'),
      });
  }

  protected cerrarAuditoria(): void {
    this.auditOpen = false;
    this.auditAgreement = null;
    this.auditEntries = [];
    this.auditError = '';
  }

  private cargarEstudiantes(): void {
    const user = this.auth.user();
    if (!user) return;

    if (user.role === 'STUDENT' && user.student_id) {
      this.students = [
        {
          id: user.student_id,
          matricula: '',
          nombre_completo: `${user.first_name} ${user.last_name}`.trim() || user.email,
          programa_doctoral: '',
          cohorte: '',
          estatus_activo: true,
        },
      ];
      this.filtroStudent = String(user.student_id);
      this.onStudentChange();
      return;
    }

    if (this.auth.hasPermission('academic.read.global')) {
      this.academic.getGlobalOverview(1).subscribe({
        next: (data) => (this.students = data.results),
        error: () => (this.students = []),
      });
      return;
    }

    this.studentsApi.getStudents(1).subscribe({
      next: (data) => (this.students = data.results),
      error: () => (this.students = []),
    });
  }

  private cargarAcuerdos(): void {
    this.cargando = true;
    this.error = '';

    const filters: AgreementFilters = {
      page: this.pagina,
      page_size: 10,
    };

    const student = Number(this.filtroStudent);
    if (Number.isInteger(student) && student > 0) filters.student = student;

    const semester = Number(this.filtroSemester);
    if (Number.isInteger(semester) && semester > 0) filters.semester = semester;

    const responsable = Number(this.filtroResponsable);
    if (Number.isInteger(responsable) && responsable > 0) filters.responsable = responsable;

    if (this.filtroEstado === 'VENCIDO') {
      filters.vencido = true;
    } else if (this.filtroEstado) {
      filters.estado = this.filtroEstado;
    }

    if (this.filtroFechaDesde) filters.fecha_desde = this.filtroFechaDesde;
    if (this.filtroFechaHasta) filters.fecha_hasta = this.filtroFechaHasta;

    this.academic
      .getAgreements(filters)
      .pipe(finalize(() => (this.cargando = false)))
      .subscribe({
        next: (data) => {
          this.agreements = data.results;
          this.total = data.count;
          this.haySiguiente = data.next !== null;
          this.mergeResponsables(data.results);
        },
        error: (err) => {
          this.agreements = [];
          this.total = 0;
          this.haySiguiente = false;
          this.error =
            err.status === 401 || err.status === 403
              ? 'No cuenta con autorización para consultar acuerdos.'
              : 'No fue posible cargar los acuerdos.';
        },
      });
  }

  private mergeResponsables(items: Agreement[]): void {
    const map = new Map(this.responsables.map((r) => [r.id, r]));
    for (const item of items) {
      if (!map.has(item.responsable)) {
        map.set(item.responsable, {
          id: item.responsable,
          nombre: item.responsable_nombre,
        });
      }
    }
    this.responsables = [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
}
