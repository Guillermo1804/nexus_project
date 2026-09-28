import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { Agreement, Semester, SemesterTutoringSession, StudentOverview, TimelineResponse } from '../core/academic/academic.models';
import { AuthService } from '../core/auth/auth.service';
import { SemesterFormComponent } from './semester-form';
import { TutoringFormComponent } from './tutoring-form';
import { TutoringObservationsComponent } from './tutoring-observations';
import { ResponsibleOption } from './tutoring-agreements';
import { EvidenceUploadComponent } from './evidence-upload';
import { TutoringConditionsComponent } from './tutoring-conditions';
import { ThesisProgressFormComponent } from './thesis-progress-form';
import { TimelineComponent } from '../shared/timeline';

type Modal = 'tutoria' | 'acuerdo' | 'estado' | 'evidencia' | 'avance' | 'semestre' | 'condiciones' | null;

@Component({
  selector: 'app-student-overview',
  imports: [CommonModule, FormsModule, SemesterFormComponent, TutoringFormComponent, TutoringObservationsComponent, EvidenceUploadComponent, TutoringConditionsComponent, ThesisProgressFormComponent, TimelineComponent],
  templateUrl: './student-overview.html',
  styleUrl: './student-overview.scss',
})
export class StudentOverviewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly academicService = inject(AcademicService);
  protected readonly auth = inject(AuthService);
  protected studentId = 0;
  protected overview: StudentOverview | null = null;
  protected agreements: Agreement[] = [];
  protected selectedSemesterId: number | null = null;
  protected modal: Modal = null;
  protected selectedAgreement: Agreement | null = null;
  protected selectedTutoring: SemesterTutoringSession | null = null;
  protected cargando = true;
  protected error = '';
  protected exitoTutoria = '';
  protected errorEstado = '';
  protected guardandoEstado = false;
  protected comentarioEstado = '';
  protected guardandoAcuerdo = false;
  protected errorAcuerdo = '';
  protected acuerdo = { sessionId: 0, descripcion: '', responsable: 0, fecha_limite: '' };
  protected activeView: 'resumen' | 'timeline' = 'resumen';
  protected timeline: TimelineResponse | null = null;
  protected timelineLoading = false;
  protected timelineError = '';
  private timelineLoaded = false;
  private tutoringActionHandled = false;

  ngOnInit(): void {
    this.studentId = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(this.studentId) && this.studentId > 0) this.cargarExpediente();
    else { this.error = 'Identificador de estudiante inválido.'; this.cargando = false; }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void { this.cerrarModal(); }

  cargarExpediente(): void {
    this.cargando = true; this.error = '';
    this.academicService.getStudentOverview(this.studentId).pipe(finalize(() => this.cargando = false)).subscribe({
      next: data => {
        this.overview = data;
        const selectedExists = data.semesters.some(s => s.id === this.selectedSemesterId);
        if (!selectedExists) this.selectedSemesterId = data.current_semester?.id ?? data.semesters.at(-1)?.id ?? null;
        this.cargarAcuerdos();
        if (!this.tutoringActionHandled && this.route.snapshot.queryParamMap.get('accion') === 'tutoria' && this.canCreateTutoring) {
          this.tutoringActionHandled = true;
          this.modal = 'tutoria';
        }
      },
      error: err => this.error = err.status === 404
        ? 'El expediente solicitado no existe o no tiene permisos para consultarlo.'
        : err.status === 401 || err.status === 403
          ? 'No cuenta con autorización para consultar este expediente.'
          : 'Error al cargar el expediente del estudiante.',
    });
  }

  private cargarAcuerdos(): void {
    this.academicService.getAgreements({ student: this.studentId, page_size: 100 }).subscribe({
      next: data => this.agreements = data.results,
      error: () => this.agreements = this.overview?.open_agreements.map(a => ({ ...a, student: this.studentId, session: null })) as Agreement[] ?? [],
    });
  }

  protected get selectedSemester(): Semester | null {
    return this.overview?.semesters.find(s => s.id === this.selectedSemesterId) ?? null;
  }

  protected get semesterSessions(): SemesterTutoringSession[] { return this.selectedSemester?.tutoring_sessions ?? []; }
  protected get tutoringSessions(): SemesterTutoringSession[] { return this.overview?.semesters.flatMap(semester => semester.tutoring_sessions ?? []) ?? []; }
  protected get semesterAgreements(): Agreement[] {
    const semester = this.selectedSemester;
    if (!semester) return [];
    const sessionIds = new Set((semester.tutoring_sessions ?? []).map(s => s.id));
    return this.agreements.filter(a => a.semester === semester.id || (a.session != null && sessionIds.has(a.session)));
  }

  protected get overdueCount(): number { return this.agreements.filter(a => a.is_vencido && a.estado !== 'CONCLUIDO').length; }
  protected get completedCount(): number { return this.semesterAgreements.filter(a => a.estado === 'CONCLUIDO').length; }
  protected get semesterOverdueCount(): number { return this.semesterAgreements.filter(a => a.is_vencido && a.estado !== 'CONCLUIDO').length; }
  protected get canCreateTutoring(): boolean { return this.auth.hasPermission('tutoring.create'); }
  protected get canAccessStudent(): boolean {
    const user = this.auth.user();
    return !!user && (user.student_id === this.studentId || this.overview?.student.user_id === user.id || this.auth.hasPermission('records.read.assigned'));
  }
  protected get canCreateAgreement(): boolean { return this.canAccessStudent && this.canCreateTutoring; }
  protected get canUploadEvidence(): boolean { return this.canAccessStudent; }
  protected get canRegisterThesisProgress(): boolean { return this.canAccessStudent; }
  protected get initials(): string {
    return (this.overview?.nombre_completo ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  protected selectSemester(id: number): void { this.selectedSemesterId = id; }
  protected selectView(view: 'resumen' | 'timeline'): void {
    this.activeView = view;
    if (view === 'timeline' && !this.timelineLoaded) this.loadTimeline();
  }
  protected loadTimeline(): void {
    if (this.timelineLoading) return;
    this.timelineLoading = true; this.timelineError = '';
    this.academicService.getTimeline(this.studentId).pipe(finalize(() => this.timelineLoading = false)).subscribe({
      next: data => { this.timeline = data; this.timelineLoaded = true; },
      error: err => this.timelineError = err.status === 404
        ? 'La trayectoria no existe o no tiene permisos para consultarla.'
        : 'No fue posible cargar la línea de tiempo.',
    });
  }
  protected isCurrentSemester(semester: Semester): boolean { return semester.id === this.overview?.current_semester?.id; }
  protected semesterStatus(semester: Semester): string { return semester.is_active ? 'EN CURSO' : 'CONCLUIDO'; }

  protected openModal(modal: Exclude<Modal, null>): void { this.modal = modal; }
  protected cerrarModal(): void {
    this.modal = null; this.selectedAgreement = null; this.selectedTutoring = null;
    this.errorEstado = ''; this.errorAcuerdo = ''; this.comentarioEstado = '';
  }

  protected abrirCondiciones(session: SemesterTutoringSession): void { this.selectedTutoring = session; this.modal = 'condiciones'; }
  protected abrirEstado(agreement: Agreement): void {
    if (agreement.estado === 'CONCLUIDO') return;
    this.selectedAgreement = agreement; this.comentarioEstado = ''; this.errorEstado = ''; this.modal = 'estado';
  }

  protected abrirNuevoAcuerdo(): void {
    const session = this.semesterSessions.at(-1);
    const responsible = this.responsibleOptions()[0];
    this.acuerdo = { sessionId: session?.id ?? 0, descripcion: '', responsable: responsible?.id ?? 0, fecha_limite: this.defaultDeadline() };
    this.errorAcuerdo = ''; this.modal = 'acuerdo';
  }

  protected crearAcuerdo(): void {
    if (!this.acuerdoValido || this.guardandoAcuerdo) return;
    this.guardandoAcuerdo = true; this.errorAcuerdo = '';
    this.academicService.createSessionAgreement(this.acuerdo.sessionId, {
      descripcion: this.acuerdo.descripcion.trim(), responsable: this.acuerdo.responsable, fecha_limite: this.acuerdo.fecha_limite,
    }).pipe(finalize(() => this.guardandoAcuerdo = false)).subscribe({
      next: () => { this.cerrarModal(); this.cargarAcuerdos(); },
      error: err => this.errorAcuerdo = err.error?.descripcion?.[0] || err.error?.responsable?.[0] || err.error?.fecha_limite?.[0] || err.error?.detail || 'No fue posible crear el acuerdo.',
    });
  }

  protected get acuerdoValido(): boolean {
    return this.acuerdo.sessionId > 0 && this.acuerdo.responsable > 0 && this.acuerdo.descripcion.trim().length >= 10 && !!this.acuerdo.fecha_limite;
  }

  protected actualizarEstadoAcuerdo(): void {
    const agreement = this.selectedAgreement;
    const next = agreement ? this.siguienteEstado(agreement.estado) : null;
    if (!agreement || !next || !this.puedeActualizarAcuerdo(agreement) || this.guardandoEstado) return;
    this.guardandoEstado = true; this.errorEstado = '';
    this.academicService.updateAgreementStatus(agreement.id, next, this.comentarioEstado.trim()).pipe(finalize(() => this.guardandoEstado = false)).subscribe({
      next: () => { this.cerrarModal(); this.cargarAcuerdos(); },
      error: err => this.errorEstado = err.status === 403 ? 'Sólo el responsable puede actualizar el estado.' : err.error?.estado?.[0] || err.error?.detail || 'No fue posible actualizar el estado del acuerdo.',
    });
  }

  protected puedeActualizarAcuerdo(agreement: { responsable: number; estado: string }): boolean {
    return this.auth.user()?.id === agreement.responsable && this.siguienteEstado(agreement.estado) !== null;
  }
  protected siguienteEstado(estado: string): 'EN_PROCESO' | 'CONCLUIDO' | null {
    return estado === 'PENDIENTE' ? 'EN_PROCESO' : estado === 'EN_PROCESO' ? 'CONCLUIDO' : null;
  }
  protected etiquetaEstado(estado: string, vencido = false): string { return vencido && estado !== 'CONCLUIDO' ? 'VENCIDO' : estado.replaceAll('_', ' '); }

  protected responsibleOptions(): ResponsibleOption[] {
    const overview = this.overview;
    if (!overview) return [];
    const options: ResponsibleOption[] = []; const seen = new Set<number>();
    const add = (id: number | null | undefined, nombre: string, etiqueta: string) => { if (id && !seen.has(id)) { seen.add(id); options.push({ id, nombre_completo: nombre, etiqueta }); } };
    add(overview.student.user_id, overview.nombre_completo, 'Estudiante');
    add(overview.advisors.advisor?.id, overview.advisors.advisor?.nombre_completo ?? '', 'Asesor Principal');
    add(overview.advisors.coadvisor?.id, overview.advisors.coadvisor?.nombre_completo ?? '', 'Coasesor');
    overview.advisors.members.forEach(m => add(m.id, m.nombre_completo, this.committeeRole(m.rol_comite)));
    return options;
  }

  protected committeeMembers(): ResponsibleOption[] { return this.responsibleOptions().filter(o => o.etiqueta !== 'Estudiante'); }
  protected committeeRole(role: string): string { return role === 'COMMITTEE_MEMBER' ? 'Miembro del Comité' : role.replaceAll('_', ' '); }
  protected thesisComponents(): { name: string; percentage: number | null; status: string }[] {
    return Object.entries(this.overview?.thesis_progress?.componentes_json ?? {}).map(([name, value]) => {
      if (typeof value === 'number') return { name: this.componentName(name), percentage: value, status: value >= 100 ? 'CONCLUIDO' : 'EN PROCESO' };
      if (value && typeof value === 'object') {
        const item = value as Record<string, unknown>;
        const raw = item['porcentaje'];
        return { name: this.componentName(name), percentage: typeof raw === 'number' ? raw : null, status: String(item['estado'] ?? 'EN PROCESO').replaceAll('_', ' ') };
      }
      return { name: this.componentName(name), percentage: null, status: String(value ?? 'PENDIENTE') };
    });
  }
  private componentName(name: string): string { return name.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, c => c.toUpperCase()); }
  private defaultDeadline(): string { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); }

  protected scrollToOverdue(): void {
    const semester = this.overview?.semesters.find(s => this.agreements.some(a => a.semester === s.id && a.is_vencido));
    if (semester) this.selectedSemesterId = semester.id;
    setTimeout(() => document.getElementById('agreements')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  protected tutoriaGuardada(): void { this.cerrarModal(); this.exitoTutoria = 'Tutoría registrada correctamente.'; this.cargarExpediente(); }
  protected semestreGuardado(): void { this.cerrarModal(); this.cargarExpediente(); }
  protected evidenciaGuardada(): void { this.cerrarModal(); }
  protected avanceGuardado(): void { this.cerrarModal(); this.cargarExpediente(); }
  protected proximaReunionGuardada(): void { this.cargarExpediente(); }
}
