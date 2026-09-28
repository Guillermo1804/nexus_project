import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
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

type EditableAgreementStatus = 'EN_PROCESO' | 'CONCLUIDO';
type DrawerMode = 'edit' | 'audit';

@Component({
  selector: 'app-agreements-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './agreements-list.html',
  styleUrl: './agreements-list.scss',
})
export class AgreementsListComponent implements OnInit {
  private readonly academic = inject(AcademicService);
  private readonly router = inject(Router);
  private readonly studentsApi = inject(StudentService);
  protected readonly auth = inject(AuthService);
  private triggerElement: HTMLElement | null = null;

  @ViewChild('drawerClose') private drawerClose?: ElementRef<HTMLButtonElement>;

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

  protected drawerOpen = false;
  protected drawerMode: DrawerMode = 'audit';
  protected drawerAgreement: Agreement | null = null;
  protected auditLoading = false;
  protected auditError = '';
  protected auditEntries: AgreementAuditEntry[] = [];
  protected selectedStatus: EditableAgreementStatus | null = null;
  protected comentario = '';
  protected saving = false;
  protected saveError = '';
  protected saveDisabled = false;

  protected readonly statuses = ['PENDIENTE', 'EN_PROCESO', 'CONCLUIDO', 'VENCIDO'] as const;

  ngOnInit(): void {
    const query = new URLSearchParams(this.router.url.split('?')[1] ?? '');
    const student = query.get('student');
    if (student && Number.isInteger(Number(student)) && Number(student) > 0) this.filtroStudent = student;
    if (query.get('vencido') === 'true') this.filtroEstado = 'VENCIDO';
    this.cargarEstudiantes();
    if (this.filtroStudent) this.onStudentChange();
    this.cargarAcuerdos();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.drawerOpen) this.cerrarDrawer();
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

  protected get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total / 10));
  }

  protected estadoVisible(a: Agreement): string {
    return a.is_vencido && a.estado !== 'CONCLUIDO' ? 'VENCIDO' : a.estado;
  }

  protected estadoLabel(estado: string): string {
    return estado === 'EN_PROCESO' ? 'EN PROCESO' : estado;
  }

  protected badgeClass(a: Agreement): string {
    const estado = this.estadoVisible(a);
    if (estado === 'VENCIDO') return 'badge-overdue';
    if (estado === 'CONCLUIDO') return 'badge-concluded';
    if (estado === 'EN_PROCESO') return 'badge-in-progress';
    return 'badge-pending';
  }

  protected abrirEdicion(a: Agreement, event?: Event): void {
    this.openDrawer(a, 'edit', event);
  }

  protected verAuditoria(a: Agreement, event?: Event): void {
    this.openDrawer(a, 'audit', event);
  }

  protected folio(a: Agreement): string {
    return `ACU-${String(a.id).padStart(3, '0')}`;
  }

  protected statusClass(status: string): string {
    if (status === 'VENCIDO') return 'status-overdue';
    if (status === 'CONCLUIDO') return 'status-concluded';
    if (status === 'EN_PROCESO') return 'status-in-progress';
    return 'status-pending';
  }

  protected isStatusCurrent(status: string): boolean {
    if (!this.drawerAgreement) return false;
    return this.selectedStatus ? status === this.selectedStatus : status === this.estadoVisible(this.drawerAgreement);
  }

  protected isStatusEnabled(status: string): boolean {
    return status === this.nextStatus() || status === this.selectedStatus;
  }

  protected selectStatus(status: string): void {
    if (status === this.nextStatus()) this.selectedStatus = status as EditableAgreementStatus;
  }

  protected guardarCambios(): void {
    if (!this.drawerAgreement || !this.selectedStatus || this.saving || this.saveDisabled) return;

    this.saving = true;
    this.saveError = '';
    this.academic
      .updateAgreementStatus(this.drawerAgreement.id, this.selectedStatus, this.comentario.trim())
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.cargarAcuerdos();
          this.cerrarDrawer();
        },
        error: (err) => {
          this.saveError =
            err.error?.estado?.[0] ||
            err.error?.detail ||
            'No fue posible actualizar el estado del acuerdo.';
          if (err.status === 403) this.saveDisabled = true;
        },
      });
  }

  protected cerrarDrawer(): void {
    this.drawerOpen = false;
    this.drawerAgreement = null;
    this.auditEntries = [];
    this.auditError = '';
    this.saveError = '';
    const trigger = this.triggerElement;
    this.triggerElement = null;
    queueMicrotask(() => trigger?.focus());
  }

  private openDrawer(a: Agreement, mode: DrawerMode, event?: Event): void {
    this.triggerElement = event?.currentTarget as HTMLElement | null;
    this.drawerAgreement = a;
    this.drawerMode = mode;
    this.drawerOpen = true;
    this.auditLoading = true;
    this.auditError = '';
    this.auditEntries = [];
    this.selectedStatus = null;
    this.comentario = '';
    this.saveError = '';
    this.saveDisabled = false;
    queueMicrotask(() => this.drawerClose?.nativeElement.focus());

    this.academic
      .getAgreementAuditLog(a.id)
      .pipe(finalize(() => (this.auditLoading = false)))
      .subscribe({
        next: (entries) => (this.auditEntries = entries),
        error: () => (this.auditError = 'No se pudo cargar la bitácora del acuerdo.'),
      });
  }

  private nextStatus(): EditableAgreementStatus | null {
    if (!this.drawerAgreement) return null;
    if (this.drawerAgreement.estado === 'PENDIENTE') return 'EN_PROCESO';
    if (this.drawerAgreement.estado === 'EN_PROCESO') return 'CONCLUIDO';
    return null;
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

    const filters: AgreementFilters = { page: this.pagina, page_size: 10 };
    const student = Number(this.filtroStudent);
    if (Number.isInteger(student) && student > 0) filters.student = student;
    const semester = Number(this.filtroSemester);
    if (Number.isInteger(semester) && semester > 0) filters.semester = semester;
    const responsable = Number(this.filtroResponsable);
    if (Number.isInteger(responsable) && responsable > 0) filters.responsable = responsable;

    if (this.filtroEstado === 'VENCIDO') filters.vencido = true;
    else if (this.filtroEstado) filters.estado = this.filtroEstado;
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
        map.set(item.responsable, { id: item.responsable, nombre: item.responsable_nombre });
      }
    }
    this.responsables = [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
}
