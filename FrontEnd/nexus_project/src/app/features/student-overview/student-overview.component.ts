import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy, input, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StudentService } from '../../core/services/student.service';
import { ThesisService } from '../../core/services/thesis.service';
import { ReportingService } from '../../core/services/reporting.service';
import { StudentDetail, Semester } from '../../core/models/student.model';
import { TutoringSession } from '../../core/models/tutoring.model';
import { Agreement } from '../../core/models/agreement.model';
import { ThesisProgress } from '../../core/models/thesis.model';
import { TimelineNode } from '../../core/models/timeline.model';
import { PeriodService } from '../../core/services/period.service';
import { PillBadgeComponent } from '../../shared/components/pill-badge/pill-badge.component';
import { TimelineComponent } from '../../shared/components/timeline/timeline.component';
import { AcademicCommitteeComponent } from '../committee/academic-committee/academic-committee.component';
import { AgreementDrawerComponent } from '../agreements/agreement-drawer/agreement-drawer.component';
import { TutoringModalComponent } from '../tutoring/tutoring-modal/tutoring-modal.component';
import { ThesisHistoryChartComponent } from '../thesis/thesis-history-chart/thesis-history-chart.component';
import { ThesisProgressFormComponent } from '../thesis/thesis-progress-form/thesis-progress-form.component';

@Component({
  selector: 'app-student-overview',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PillBadgeComponent,
    TimelineComponent,
    AcademicCommitteeComponent,
    AgreementDrawerComponent,
    TutoringModalComponent,
    ThesisHistoryChartComponent,
    ThesisProgressFormComponent
  ],
  templateUrl: './student-overview.component.html',
  styleUrls: ['./student-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentOverviewComponent implements OnInit {
  readonly authService = inject(AuthService);
  private studentService = inject(StudentService);
  private thesisService = inject(ThesisService);
  private reportingService = inject(ReportingService);
  readonly periodService = inject(PeriodService);
  private route = inject(ActivatedRoute);


  // Export state
  readonly isExporting = this.reportingService.exporting;

  // Optional route param binding via input or ActivatedRoute
  readonly id = input<string>();

  // State Signals
  readonly student = signal<StudentDetail | null>(null);
  readonly semesters = signal<Semester[]>([]);
  readonly activeSemester = signal<number | 'ALL'>(1);
  readonly tutoringSessions = signal<TutoringSession[]>([]);
  readonly agreements = signal<Agreement[]>([]);
  readonly thesisProgress = signal<ThesisProgress | null>(null);
  readonly timelineNodes = signal<TimelineNode[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly activeTab = signal<'RESUMEN' | 'TIMELINE' | 'ACUERDOS' | 'TUTORIAS' | 'TESIS'>('RESUMEN');

  // Modal & Drawer Control Signals
  readonly isDrawerOpen = signal<boolean>(false);
  readonly drawerMode = signal<'CREATE' | 'STATUS_UPDATE'>('CREATE');
  readonly selectedAgreement = signal<Agreement | null>(null);
  readonly isTutoringModalOpen = signal<boolean>(false);
  readonly isThesisModalOpen = signal<boolean>(false);

  // Computed views based on active semester
  readonly currentSemesterData = computed(() => {
    const semNumber = this.activeSemester();
    if (semNumber === 'ALL') return null;
    return this.semesters().find(s => s.numero === semNumber || s.number === semNumber) || null;
  });

  readonly filteredAgreements = computed(() => {
    const sem = this.activeSemester();
    const list = this.agreements();
    if (sem === 'ALL') return list;
    return list.filter(a => a.semesterNumber === sem || (a as any).semester_numero === sem);
  });

  readonly filteredTutoringSessions = computed(() => {
    const sem = this.activeSemester();
    const list = this.tutoringSessions();
    if (sem === 'ALL') return list;
    return list.filter(t => t.semesterNumber === sem || (t as any).semester_numero === sem || (t.semester as any)?.numero === sem);
  });

  readonly filteredTimelineNodes = computed(() => {
    const sem = this.activeSemester();
    const list = this.timelineNodes();
    if (sem === 'ALL') return list;
    return list.filter(node => node.semesterNumber === sem || (node as any).semester_numero === sem);
  });

  readonly studentIdNum = computed(() => {
    const s = this.student();
    return s ? Number(s.id) : 1;
  });

  readonly activeSemesterNum = computed<number>(() => {
    const sem = this.activeSemester();
    if (sem === 'ALL') {
      return this.student()?.currentSemester || (this.student() as any)?.current_semester || 1;
    }
    return typeof sem === 'number' ? sem : 1;
  });

  readonly activeSemesterId = computed<number>(() => {
    const semNum = this.activeSemesterNum();
    const st = this.student();
    if (st && st.semesters && st.semesters.length > 0) {
      const match = st.semesters.find(s => (s.numero || s.number) === semNum);
      if (match) return match.id;
      return st.semesters[0].id;
    }
    return semNum;
  });

  // Summary counts for filtered active semester
  readonly pendingAgreementsCount = computed(() => {
    return this.filteredAgreements().filter(a => a.status === 'PENDIENTE' || a.estado === 'PENDIENTE').length;
  });

  readonly inProgressAgreementsCount = computed(() => {
    return this.filteredAgreements().filter(a => a.status === 'EN_PROCESO' || a.estado === 'EN_PROCESO').length;
  });

  readonly overdueAgreementsCount = computed(() => {
    return this.filteredAgreements().filter(a => a.status === 'VENCIDO' || a.estado === 'VENCIDO' || a.isOverdue || a.is_vencido).length;
  });

  readonly concludedAgreementsCount = computed(() => {
    return this.filteredAgreements().filter(a => a.status === 'CONCLUIDO' || a.estado === 'CONCLUIDO').length;
  });

  // Total overdue count for global student trajectory
  readonly totalOverdueAgreementsCount = computed(() => {
    return this.agreements().filter(a => a.status === 'VENCIDO' || a.estado === 'VENCIDO' || a.isOverdue || a.is_vencido).length;
  });

  // Dynamic breakdown of thesis progress components from backend
  readonly thesisComponentsList = computed(() => {
    const tp: any = this.thesisProgress();
    const comps = tp?.componentes_json || tp?.components;
    if (!comps) {
      return [
        { label: 'Protocolo de Investigación', value: 0 },
        { label: 'Estado del Arte', value: 0 },
        { label: 'Marco Teórico', value: 0 },
        { label: 'Metodología', value: 0 },
        { label: 'Análisis de Resultados', value: 0 },
        { label: 'Redacción de Tesis', value: 0 }
      ];
    }
    return [
      { label: 'Protocolo de Investigación', value: comps.protocolo ?? 0 },
      { label: 'Estado del Arte', value: comps.estadoArte ?? 0 },
      { label: 'Marco Teórico', value: comps.marcoTeorico ?? 0 },
      { label: 'Metodología', value: comps.metodologia ?? 0 },
      { label: 'Análisis de Resultados', value: comps.analisis ?? 0 },
      { label: 'Redacción de Tesis', value: comps.redaccion ?? 0 }
    ];
  });

  constructor() {
    effect(() => {
      const period = this.periodService.activePeriod();
      // Read student untracked to avoid cyclic dependency when student() is updated
      const currentSt = untracked(() => this.student());
      const routeParamId = this.route.snapshot.paramMap.get('id');
      
      // If student role, stay on their own record
      if (this.authService.isStudent()) {
        return;
      }

      if (period !== 'TODOS' && (!routeParamId || routeParamId === '1')) {
        this.studentService.getStudents().subscribe(res => {
          const list = res.results || res;
          if (Array.isArray(list) && list.length > 0) {
            const matching = list.find(s => s.cohorte === period || s.cohort === period);
            if (matching && String(matching.id) !== String(currentSt?.id)) {
              this.loadStudentOverview(matching.id.toString());
            }
          }
        });
      }
    });
  }

  ngOnInit(): void {
    const routeId = this.id() || this.route.snapshot.paramMap.get('id');
    const myStudentId = this.authService.getStudentId();

    if (this.authService.isStudent() && myStudentId) {
      this.loadStudentOverview(myStudentId.toString());
      return;
    }

    if (routeId && routeId !== '1') {
      this.loadStudentOverview(routeId);
    } else {
      this.studentService.getStudents().subscribe(res => {
        const list = res.results || res;
        if (Array.isArray(list) && list.length > 0) {
          this.loadStudentOverview(list[0].id.toString());
        } else {
          this.loadStudentOverview(routeId || '1');
        }
      });
    }
  }

  loadStudentOverview(studentId: string): void {
    this.isLoading.set(true);

    this.studentService.getStudentDetail(studentId).subscribe(detail => {
      this.student.set(detail);
      const sems = detail.semesters || [];
      this.semesters.set(sems);
      
      const activeSemObj = sems.find(s => s.is_active || s.isCurrent);
      const curSemNum = detail.currentSemester || (detail as any).current_semester || (activeSemObj ? (activeSemObj.numero || activeSemObj.number) : (sems.length > 0 ? (sems[0].numero || sems[0].number) : 1));
      this.activeSemester.set(curSemNum || 1);

      // Load related collections
      this.studentService.getTutoringSessions(studentId).subscribe(sessions => {
        this.tutoringSessions.set(sessions || []);
      });

      this.studentService.getAgreements(studentId).subscribe(agreements => {
        this.agreements.set(agreements || []);
      });

      this.studentService.getThesisProgress(studentId).subscribe(progress => {
        this.thesisProgress.set(progress);
      });

      this.studentService.getStudentTimeline(studentId).subscribe(nodes => {
        this.timelineNodes.set(nodes || []);
        this.isLoading.set(false);
      });
    });
  }

  selectSemester(semesterNumber?: number | 'ALL'): void {
    if (semesterNumber === undefined) return;
    this.activeSemester.set(semesterNumber);
  }

  setActiveTab(tab: 'RESUMEN' | 'TIMELINE' | 'ACUERDOS' | 'TUTORIAS' | 'TESIS'): void {
    this.activeTab.set(tab);
  }

  // Drawer Actions
  openCreateAgreementDrawer(): void {
    this.drawerMode.set('CREATE');
    this.selectedAgreement.set(null);
    this.isDrawerOpen.set(true);
  }

  openUpdateAgreementDrawer(agreement: Agreement): void {
    this.drawerMode.set('STATUS_UPDATE');
    this.selectedAgreement.set(agreement);
    this.isDrawerOpen.set(true);
  }

  closeAgreementDrawer(): void {
    this.isDrawerOpen.set(false);
    this.selectedAgreement.set(null);
  }

  onAgreementSaved(savedAgr: Agreement): void {
    const studentId = String(savedAgr.studentId || this.student()?.id || '1');
    if (this.drawerMode() === 'CREATE') {
      this.agreements.update(list => [savedAgr, ...list]);
    } else {
      this.agreements.update(list => list.map(a => a.id === savedAgr.id ? savedAgr : a));
    }
    // Refresh timeline after agreement updates
    this.studentService.getStudentTimeline(studentId).subscribe(nodes => {
      if (nodes && nodes.length > 0) {
        this.timelineNodes.set(nodes);
      }
    });
  }

  // Tutoring Modal Actions
  openTutoringModal(): void {
    this.isTutoringModalOpen.set(true);
  }

  closeTutoringModal(): void {
    this.isTutoringModalOpen.set(false);
  }

  onTutoringSessionSaved(session: TutoringSession): void {
    const studentId = String(session.student || this.student()?.id || '1');
    
    // Add new session immediately to local reactive signal
    this.tutoringSessions.update(list => [session, ...list.filter(s => s.id !== session.id)]);
    
    // Refresh tutoring sessions from backend
    this.studentService.getTutoringSessions(studentId).subscribe(sessions => {
      if (sessions && sessions.length > 0) {
        this.tutoringSessions.set(sessions);
      }
    });

    // Refresh agreements reactively
    this.studentService.getAgreements(studentId).subscribe(agreements => {
      if (agreements && agreements.length > 0) {
        this.agreements.set(agreements);
      }
    });

    // Refresh longitudinal timeline nodes reactively
    this.studentService.getStudentTimeline(studentId).subscribe(nodes => {
      if (nodes && nodes.length > 0) {
        this.timelineNodes.set(nodes);
      } else {
        const semNum = session.semester_numero ?? (typeof session.semester === 'number' ? session.semester : 1);
        const newTimelineNode: TimelineNode = {
          id: String(session.id || Date.now()),
          type: 'TUTORIA',
          tipo: 'TUTORIA',
          title: `Sesión de Tutoría (${session.modalidad || 'PRESENCIAL'})`,
          titulo: `Sesión de Tutoría (${session.modalidad || 'PRESENCIAL'})`,
          subtitle: `Semestre ${semNum}`,
          description: session.resumen || 'Sesión de tutoría registrada con acuerdos y observaciones.',
          descripcion: session.resumen || 'Sesión de tutoría registrada con acuerdos y observaciones.',
          date: session.fecha_sesion || new Date().toISOString().split('T')[0],
          fecha: session.fecha_sesion || new Date().toISOString().split('T')[0],
          semesterNumber: semNum,
          authorName: session.created_by_nombre || 'Comité Tutorial',
          authorRole: 'Comité Tutorial',
          status: 'CONCLUIDO',
          estado: 'CONCLUIDO',
          badgeText: session.modalidad || 'PRESENCIAL',
          badgeType: 'CONCLUIDO'
        };
        this.timelineNodes.update(currentNodes => [newTimelineNode, ...currentNodes]);
      }
    });
  }

  // Thesis Modal Actions (HU-15 / HU-16)
  openThesisModal(): void {
    this.isThesisModalOpen.set(true);
  }

  closeThesisModal(): void {
    this.isThesisModalOpen.set(false);
  }

  onThesisProgressSaved(progress: ThesisProgress): void {
    const studentId = String(progress.student || this.student()?.id || '1');
    this.thesisProgress.set(progress);
    
    // Refresh student timeline
    this.studentService.getStudentTimeline(studentId).subscribe(nodes => {
      if (nodes && nodes.length > 0) {
        this.timelineNodes.set(nodes);
      }
    });
  }

  // Export Actions (HU-28)
  exportExcel(): void {
    const s = this.student();
    if (!s) return;
    this.reportingService.downloadStudentDossier(Number(s.id), 'xlsx', s.matricula);
  }

  exportPdf(): void {
    const s = this.student();
    if (!s) return;
    this.reportingService.downloadStudentDossier(Number(s.id), 'pdf', s.matricula);
  }

  getNodeIcon(type: string): string {
    switch (type) {
      case 'TUTORIA': return '📘';
      case 'ACUERDO': return '📝';
      case 'TESIS': return '📊';
      case 'EVIDENCIA': return '📎';
      case 'PRODUCCION': return '🎓';
      default: return '📌';
    }
  }
}
