import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
import { ModalFocusDirective } from '../shared/modal-focus.directive';
import { ToastService } from '../shared/toast.service';

interface ResponsableOption {
  id: number;
  nombre: string;
}

type EditableAgreementStatus = 'EN_PROCESO' | 'CONCLUIDO';
type DrawerMode = 'edit' | 'audit';

@Component({
  selector: 'app-agreements-list',
  imports: [CommonModule, FormsModule, ModalFocusDirective],
  templateUrl: './agreements-list.html',
  styleUrl: './agreements-list.scss',
})
export class AgreementsListComponent implements OnInit {
  private readonly academic = inject(AcademicService);
  private readonly studentsApi = inject(StudentService);
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);
  private triggerElement: HTMLElement | null = null;

  @ViewChild('drawerClose') private drawerClose?: ElementRef<HTMLButtonElement>;

  protected agreements: Agreement[] = [];
  protected students: StudentRecord[] = [];
  protected semesters: Semester[] = [];
  protected responsables: ResponsableOption[] = [];

  protected filtroStudent = '';
  protected filtroSemester = '';
  protected filtroResponsable = '';
  protected filtroFechaDesde = '';
  protected filtroFechaHasta = '';
  protected filtroBusqueda = '';
  /** Estados marcados a la vez; vacío significa todos. Igual que la línea de tiempo. */
  protected estadosSeleccionados: string[] = [];
  /** Por urgencia: vencidos, luego lo que vence y por último lo ya concluido. */
  protected filtroOrden = 'urgencia';

  protected readonly ordenes: { value: string; label: string; corto: string }[] = [
    { value: 'urgencia', label: 'Urgencia (lo que requiere atención)', corto: 'Urgencia' },
    { value: 'urgencia_desc', label: 'Urgencia (lo menos urgente primero)', corto: 'Menos urgente' },
    { value: 'fecha_limite', label: 'Fecha límite: la más próxima primero', corto: 'Vence pronto' },
    { value: 'fecha_limite_desc', label: 'Fecha límite: la más lejana primero', corto: 'Vence tarde' },
    { value: 'responsable', label: 'Responsable (A–Z)', corto: 'Responsable' },
    { value: 'estudiante', label: 'Estudiante (A–Z)', corto: 'Estudiante' },
    { value: 'creado_desc', label: 'Añadidos recientemente', corto: 'Recientes' },
  ];

  protected readonly estadosDisponibles: { value: string; label: string }[] = [
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'EN_PROCESO', label: 'En proceso' },
    { value: 'VENCIDO', label: 'Vencido' },
    { value: 'CONCLUIDO', label: 'Concluido' },
  ];

  protected isEstadoActivo(estado: string): boolean {
    return this.estadosSeleccionados.includes(estado);
  }

  /** Los estados se acumulan, igual que los filtros de la línea de tiempo. */
  protected alternarEstado(estado: string): void {
    this.estadosSeleccionados = this.isEstadoActivo(estado)
      ? this.estadosSeleccionados.filter((item) => item !== estado)
      : [...this.estadosSeleccionados, estado];
    this.pagina = 1;
    this.cargarAcuerdos();
  }

  protected limpiarEstados(): void {
    this.estadosSeleccionados = [];
    this.pagina = 1;
    this.cargarAcuerdos();
  }

  /** Cuántos acuerdos hay en cada estado, para que el filtro diga si dalgo habría resultados. */
  protected conteoPorEstado(): Record<string, number> {
    const conteo: Record<string, number> = {};
    for (const agreement of this.agreements) {
      const clave = this.estadoVisible(agreement);
      conteo[clave] = (conteo[clave] ?? 0) + 1;
    }
    return conteo;
  }

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
    const queryParams = this.route.snapshot.queryParamMap;
    this.filtroStudent = queryParams.get('student') ?? '';
    const estadoInicial = queryParams.get('vencido') === 'true' ? 'VENCIDO' : queryParams.get('estado') ?? '';
    this.estadosSeleccionados = estadoInicial ? [estadoInicial] : [];
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
    this.estadosSeleccionados = [];
    this.filtroResponsable = '';
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.filtroBusqueda = '';
    this.filtroOrden = 'urgencia';
    this.semesters = [];
    this.pagina = 1;
    this.cargarAcuerdos();
  }

  /** Cambiar el orden vuelve a la primera página: en la 5 el sentido ya no se percibe. */
  protected cambiarOrden(orden: string): void {
    this.filtroOrden = orden;
    this.pagina = 1;
    this.cargarAcuerdos();
  }

  protected get filtrosActivos(): number {
    return [
      this.filtroStudent, this.filtroSemester, this.filtroResponsable, this.estadosSeleccionados.length ? 'x' : '',
      this.filtroFechaDesde, this.filtroFechaHasta, this.filtroBusqueda.trim(),
    ].filter((value) => !!value).length;
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

  /** Los estados se muestran en lenguaje natural, no como la constante del backend. */
  protected estadoLabel(estado: string): string {
    const etiquetas: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      EN_PROCESO: 'En proceso',
      CONCLUIDO: 'Concluido',
      VENCIDO: 'Vencido',
    };
    return etiquetas[estado] ?? (estado ? estado.replaceAll('_', ' ').toLowerCase() : '—');
  }

  protected badgeClass(a: Agreement): string {
    const estado = this.estadoVisible(a);
    if (estado === 'VENCIDO') return 'badge-overdue';
    if (estado === 'CONCLUIDO') return 'badge-concluded';
    if (estado === 'EN_PROCESO') return 'badge-in-progress';
    return 'badge-pending';
  }

  /**
   * Un clic siempre responde. Antes el botón iba deshabilitado para los acuerdos
   * vencidos y sólo explicaba el motivo en un `title` de hover, que en móvil no
   * existe: el clic no hacía nada y parecía una aplicación colgada. Ahora el panel
   * se abre en modo de sólo lectura y explica allí por qué no se puede modificar.
   */
  protected abrirEdicion(a: Agreement, event?: Event): void {
    if (a.is_vencido) {
      this.toasts.info(
        `«${this.corte(a.descripcion)}» está vencido: se abre en lectura para que puedas revisar su bitácora, pero no admite cambios.`,
      );
      this.openDrawer(a, 'audit', event);
      return;
    }
    this.openDrawer(a, 'edit', event);
  }

  /** Recorta el texto del acuerdo para que el aviso quepa en una línea. */
  private corte(texto: string, maximo = 48): string {
    return texto.length > maximo ? `${texto.slice(0, maximo)}…` : texto;
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
    return !this.drawerAgreement?.is_vencido && (status === this.nextStatus() || status === this.selectedStatus);
  }

  /**
   * Explica por qué un estado no se puede elegir. Los botones salen apagados y, sin
   * esto, el usuario sólo veía una pantalla que parecía no responder.
   *
   * Sin argumento devuelve la regla general —la que se muestra bajo los botones—;
   * con el estado concreto, el motivo de ese botón en particular.
   */
  protected motivoBloqueoEstado(status?: string): string {
    const agreement = this.drawerAgreement;
    if (!agreement) return '';
    if (agreement.is_vencido) return 'Este acuerdo está vencido: los compromisos vencidos quedan cerrados y no admiten cambios de estado.';
    if (this.saveDisabled) return 'Sólo la persona responsable del acuerdo puede cambiar su estado.';
    if (agreement.estado === 'CONCLUIDO') return 'El acuerdo ya está concluido y no admite más cambios.';
    if (!status) return `Sólo se puede pasar de «${this.estadoLabel(agreement.estado)}» a «${this.estadoLabel(this.nextStatus() ?? '')}».`;
    if (status === this.nextStatus() || status === this.selectedStatus) return '';
    return `Desde «${this.estadoLabel(agreement.estado)}» sólo se puede pasar a «${this.estadoLabel(this.nextStatus() ?? '')}».`;
  }

  protected selectStatus(status: string): void {
    if (status === this.nextStatus()) this.selectedStatus = status as EditableAgreementStatus;
  }

  protected guardarCambios(): void {
    if (!this.drawerAgreement || this.drawerAgreement.is_vencido || !this.selectedStatus || this.saving || this.saveDisabled) return;

    this.saving = true;
    this.saveError = '';
    this.academic
      .updateAgreementStatus(this.drawerAgreement.id, this.selectedStatus, this.comentario.trim())
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.cargarAcuerdos();
          this.cerrarDrawer();
          this.toasts.exito('Estado actualizado y anotado en la bitácora.');
        },
        error: (err) => {
          this.saveError =
            err.error?.estado?.[0] ||
            err.error?.detail ||
            'No fue posible actualizar el estado del acuerdo.';
          if (err.status === 403) this.saveDisabled = true;
          this.toasts.error(this.saveError);
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
    if (!this.drawerAgreement || this.drawerAgreement.is_vencido) return null;
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

    if (this.estadosSeleccionados.length) filters.estados = this.estadosSeleccionados.join(',');
    if (this.filtroFechaDesde) filters.fecha_desde = this.filtroFechaDesde;
    if (this.filtroFechaHasta) filters.fecha_hasta = this.filtroFechaHasta;
    if (this.filtroBusqueda.trim()) filters.busqueda = this.filtroBusqueda.trim();
    if (this.filtroOrden) filters.orden = this.filtroOrden;

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
