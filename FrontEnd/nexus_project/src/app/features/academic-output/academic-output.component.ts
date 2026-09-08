import { Component, OnInit, signal, computed, inject, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AcademicOutputService } from '../../core/services/academic-output.service';
import { StudentService } from '../../core/services/student.service';
import { PeriodService } from '../../core/services/period.service';
import {
  Publication,
  PublicationType,
  PublicationStatus,
  AcademicEvent,
  AcademicEventType,
  ModalityType,
  ResearchStay,
  OtherProduct,
  OtherProductType
} from '../../core/models/academic-output.model';
import { Student } from '../../core/models/student.model';
import { PillBadgeComponent } from '../../shared/components/pill-badge/pill-badge.component';

export type AcademicTab = 'PUBLICACIONES' | 'CONGRESOS' | 'ESTANCIAS' | 'PRODUCTOS';

@Component({
  selector: 'app-academic-output',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PillBadgeComponent
  ],
  templateUrl: './academic-output.component.html',
  styleUrls: ['./academic-output.component.scss']
})
export class AcademicOutputComponent implements OnInit {
  private authService = inject(AuthService);
  private academicService = inject(AcademicOutputService);
  private studentService = inject(StudentService);
  readonly periodService = inject(PeriodService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  // Active Tab Signal
  activeTab = signal<AcademicTab>('PUBLICACIONES');

  // Selected Student Signal
  selectedStudentId = signal<number>(1);
  studentsList = signal<Student[]>([]);
  currentStudent = signal<Student | null>(null);

  // Data signals from service
  publications = this.academicService.publications;
  academicEvents = this.academicService.academicEvents;
  researchStays = this.academicService.researchStays;
  otherProducts = this.academicService.otherProducts;
  isLoading = this.academicService.loading;

  // Search & Filter
  searchTerm = signal<string>('');

  // Modals state
  isModalOpen = signal<boolean>(false);
  modalType = signal<AcademicTab>('PUBLICACIONES');

  // Reactive Forms
  publicationForm!: FormGroup;
  eventForm!: FormGroup;
  stayForm!: FormGroup;
  productForm!: FormGroup;

  // Form submitting state
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Filtered lists
  filteredPublications = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.publications();
    if (!term) return list;
    return list.filter(p =>
      p.titulo.toLowerCase().includes(term) ||
      p.autores_texto.toLowerCase().includes(term) ||
      p.revista_editorial.toLowerCase().includes(term)
    );
  });

  filteredEvents = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.academicEvents();
    if (!term) return list;
    return list.filter(e =>
      e.nombre_evento.toLowerCase().includes(term) ||
      e.titulo_ponencia.toLowerCase().includes(term) ||
      e.sede_lugar.toLowerCase().includes(term)
    );
  });

  filteredStays = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.researchStays();
    if (!term) return list;
    return list.filter(s =>
      s.institucion_receptora.toLowerCase().includes(term) ||
      s.pais.toLowerCase().includes(term) ||
      s.responsable_estancia.toLowerCase().includes(term)
    );
  });

  filteredProducts = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.otherProducts();
    if (!term) return list;
    return list.filter(pr =>
      pr.titulo.toLowerCase().includes(term) ||
      pr.descripcion.toLowerCase().includes(term)
    );
  });

  constructor() {
    effect(() => {
      const period = this.periodService.activePeriod();
      if (this.authService.isStudent()) return;
      const list = untracked(() => this.studentsList());
      if (period !== 'TODOS' && list.length > 0) {
        const matching = list.find(s => s.cohorte === period || s.cohort === period);
        if (matching && matching.id !== this.selectedStudentId()) {
          this.selectedStudentId.set(matching.id);
          this.currentStudent.set(matching);
          this.loadAllAcademicOutput();
        }
      }
    });
  }

  ngOnInit(): void {
    this.initForms();

    if (this.authService.isStudent()) {
      const myId = this.authService.getStudentId() || 1;
      this.selectedStudentId.set(myId);
      this.loadStudentData();
      this.loadAllAcademicOutput();
      return;
    }

    // Check query params
    this.route.queryParams.subscribe(params => {
      if (params['studentId'] || params['student']) {
        this.selectedStudentId.set(Number(params['studentId'] || params['student']));
      }
      if (params['tab']) {
        const tab = params['tab'].toUpperCase();
        if (['PUBLICACIONES', 'CONGRESOS', 'ESTANCIAS', 'PRODUCTOS'].includes(tab)) {
          this.activeTab.set(tab as AcademicTab);
        }
      }
      this.loadStudentData();
      this.loadAllAcademicOutput();
    });

    this.studentService.getStudents().subscribe(res => {
      const students = res?.results || [];
      this.studentsList.set(students);
      if (!this.currentStudent() && students.length > 0) {
        const targetId = this.selectedStudentId() || students[0].id;
        this.selectedStudentId.set(targetId);
        const match = students.find(s => s.id === targetId) || students[0];
        this.currentStudent.set(match);
        this.loadAllAcademicOutput();
      }
    });
  }

  private initForms(): void {
    this.publicationForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(255)]],
      autores_texto: ['', Validators.required],
      tipo: ['ARTICULO_JCR' as PublicationType, Validators.required],
      revista_editorial: ['', [Validators.required, Validators.maxLength(255)]],
      estado: ['PUBLICADO' as PublicationStatus, Validators.required],
      fecha_publicacion: [''],
      doi_url: ['']
    });

    this.eventForm = this.fb.group({
      tipo_evento: ['CONGRESO_INTERNACIONAL' as AcademicEventType, Validators.required],
      nombre_evento: ['', [Validators.required, Validators.maxLength(255)]],
      titulo_ponencia: ['', [Validators.required, Validators.maxLength(255)]],
      fecha_presentacion: [new Date().toISOString().split('T')[0], Validators.required],
      sede_lugar: ['', [Validators.required, Validators.maxLength(255)]],
      modalidad: ['PRESENCIAL' as ModalityType, Validators.required]
    });

    this.stayForm = this.fb.group({
      institucion_receptora: ['', [Validators.required, Validators.maxLength(255)]],
      pais: ['', [Validators.required, Validators.maxLength(100)]],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      responsable_estancia: ['', [Validators.required, Validators.maxLength(255)]],
      objetivos: [''],
      resultados: ['']
    });

    this.productForm = this.fb.group({
      tipo_producto: ['SOFTWARE' as OtherProductType, Validators.required],
      titulo: ['', [Validators.required, Validators.maxLength(255)]],
      descripcion: ['', Validators.required],
      fecha_registro: [new Date().toISOString().split('T')[0], Validators.required]
    });
  }

  selectTab(tab: AcademicTab): void {
    this.activeTab.set(tab);
    this.searchTerm.set('');
  }

  onStudentChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const studentId = Number(target.value);
    this.selectedStudentId.set(studentId);
    this.loadStudentData();
    this.loadAllAcademicOutput();
  }

  loadStudentData(): void {
    const id = this.selectedStudentId();
    if (!id) return;
    this.studentService.getStudentById(id).subscribe((student: Student) => {
      this.currentStudent.set(student);
    });
  }

  loadAllAcademicOutput(): void {
    const studentId = this.selectedStudentId();
    if (!studentId) return;

    this.academicService.getPublications({ student: studentId }).subscribe();
    this.academicService.getAcademicEvents({ student: studentId }).subscribe();
    this.academicService.getResearchStays({ student: studentId }).subscribe();
    this.academicService.getOtherProducts({ student: studentId }).subscribe();
  }

  // Modals management
  openCreateModal(tab?: AcademicTab): void {
    this.modalType.set(tab || this.activeTab());
    this.errorMessage.set('');
    this.successMessage.set('');
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  submitPublication(): void {
    if (this.publicationForm.invalid) {
      this.publicationForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const payload = {
      ...this.publicationForm.value,
      student: this.selectedStudentId()
    };

    this.academicService.createPublication(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set('Publicación registrada correctamente');
        this.publicationForm.reset({
          tipo: 'ARTICULO_JCR',
          estado: 'PUBLICADO'
        });
        setTimeout(() => this.closeModal(), 1000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.detail || 'Error al registrar la publicación.');
      }
    });
  }

  submitEvent(): void {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const payload = {
      ...this.eventForm.value,
      student: this.selectedStudentId()
    };

    this.academicService.createAcademicEvent(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set('Evento académico registrado correctamente');
        this.eventForm.reset({
          tipo_evento: 'CONGRESO_INTERNACIONAL',
          modalidad: 'PRESENCIAL',
          fecha_presentacion: new Date().toISOString().split('T')[0]
        });
        setTimeout(() => this.closeModal(), 1000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.detail || 'Error al registrar el evento.');
      }
    });
  }

  submitStay(): void {
    if (this.stayForm.invalid) {
      this.stayForm.markAllAsTouched();
      return;
    }

    const { fecha_inicio, fecha_fin } = this.stayForm.value;
    if (fecha_inicio && fecha_fin && fecha_fin < fecha_inicio) {
      this.errorMessage.set('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const payload = {
      ...this.stayForm.value,
      student: this.selectedStudentId()
    };

    this.academicService.createResearchStay(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set('Estancia de investigación registrada correctamente');
        this.stayForm.reset();
        setTimeout(() => this.closeModal(), 1000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.fecha_fin?.[0] || err?.error?.detail || 'Error al registrar la estancia.');
      }
    });
  }

  submitProduct(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const payload = {
      ...this.productForm.value,
      student: this.selectedStudentId()
    };

    this.academicService.createOtherProduct(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set('Producto tecnológico registrado correctamente');
        this.productForm.reset({
          tipo_producto: 'SOFTWARE',
          fecha_registro: new Date().toISOString().split('T')[0]
        });
        setTimeout(() => this.closeModal(), 1000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.detail || 'Error al registrar el producto.');
      }
    });
  }

  deleteItem(tab: AcademicTab, id: number): void {
    if (!confirm('¿Está seguro de eliminar este registro de producción científica?')) {
      return;
    }

    if (tab === 'PUBLICACIONES') {
      this.academicService.deletePublication(id).subscribe();
    } else if (tab === 'CONGRESOS') {
      this.academicService.deleteAcademicEvent(id).subscribe();
    } else if (tab === 'ESTANCIAS') {
      this.academicService.deleteResearchStay(id).subscribe();
    } else if (tab === 'PRODUCTOS') {
      this.academicService.deleteOtherProduct(id).subscribe();
    }
  }
}
