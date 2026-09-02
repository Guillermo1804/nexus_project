import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { StudentService } from '../../core/services/student.service';
import { Student } from '../../core/models/student.model';
import { PillBadgeComponent } from '../../shared/components/pill-badge/pill-badge.component';

@Component({
  selector: 'app-students-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, PillBadgeComponent],
  template: `
    <div class="students-page">
      <div class="page-header">
        <div>
          <h2>Padrón de Estudiantes de Doctorado</h2>
          <p class="subtitle">Directorio oficial de alumnos matriculados y seguimiento curricular</p>
        </div>
        <button type="button" class="btn-nexus-primary" (click)="openRegisterModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Registrar Estudiante
        </button>
      </div>

      <!-- Alertas de éxito o error -->
      @if (successMessage()) {
        <div class="alert alert-success">
          <span>✓ {{ successMessage() }}</span>
          <button type="button" class="alert-close" (click)="successMessage.set(null)">×</button>
        </div>
      }
      @if (errorMessage()) {
        <div class="alert alert-danger">
          <span>⚠️ {{ errorMessage() }}</span>
          <button type="button" class="alert-close" (click)="errorMessage.set(null)">×</button>
        </div>
      }

      <div class="nexus-card">
        <div class="table-responsive">
          <table class="nexus-table">
            <thead>
              <tr>
                <th>Estudiante / Matrícula</th>
                <th>Programa</th>
                <th>Cohorte</th>
                <th>Semestre Actual</th>
                <th>Estatus</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (st of students(); track st.id) {
                <tr>
                  <td>
                    <div class="student-cell">
                      <div class="student-avatar">{{ (st.nombre_completo || st.fullName || st.user?.fullName || st.matricula).charAt(0) }}</div>
                      <div>
                        <strong>{{ st.nombre_completo || st.fullName || st.user?.fullName || st.matricula }}</strong>
                        <span class="sub-matricula">{{ st.matricula }}</span>
                      </div>
                    </div>
                  </td>
                  <td>{{ st.programa_doctoral || st.program || 'Doctorado en Ciencias Computacionales' }}</td>
                  <td>{{ st.cohorte || st.cohort || '2025-A' }}</td>
                  <td>
                    <span class="semester-pill">{{ st.currentSemester || 1 }}° Semestre</span>
                  </td>
                  <td>
                    <app-pill-badge [type]="st.estatus_activo !== false ? 'CONCLUIDO' : 'CANCELADO'" [text]="st.estatus_activo !== false ? 'ACTIVO' : 'INACTIVO'" size="sm">
                    </app-pill-badge>
                  </td>
                  <td>
                    <a [routerLink]="['/students', st.id]" class="btn-nexus-outline btn-sm">
                      Ver Expediente
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL DE REGISTRO DE ESTUDIANTE -->
      @if (isRegisterModalOpen()) {
        <div class="modal-backdrop" (click)="closeRegisterModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="header-title">
                <span class="header-icon">🎓</span>
                <div>
                  <h3>Registrar Nuevo Estudiante Doctoral</h3>
                  <p class="header-sub">Alta formal en el Núcleo de Expediente y Seguimiento</p>
                </div>
              </div>
              <button type="button" class="btn-close" (click)="closeRegisterModal()">×</button>
            </div>

            <form [formGroup]="registerForm" (ngSubmit)="submitRegister()">
              <div class="modal-body">
                <div class="form-grid">
                  <div class="form-group">
                    <label for="matricula">Matrícula Oficial <span class="req">*</span></label>
                    <input
                      id="matricula"
                      type="text"
                      class="nexus-input"
                      placeholder="Ej. DOC-2026-011"
                      formControlName="matricula"
                    />
                    @if (registerForm.get('matricula')?.invalid && registerForm.get('matricula')?.touched) {
                      <span class="field-error">La matrícula es obligatoria.</span>
                    }
                  </div>

                  <div class="form-group">
                    <label for="nombre_completo">Nombre Completo <span class="req">*</span></label>
                    <input
                      id="nombre_completo"
                      type="text"
                      class="nexus-input"
                      placeholder="Ej. Lic. Laura Méndez Aranda"
                      formControlName="nombre_completo"
                    />
                    @if (registerForm.get('nombre_completo')?.invalid && registerForm.get('nombre_completo')?.touched) {
                      <span class="field-error">El nombre completo es obligatorio.</span>
                    }
                  </div>

                  <div class="form-group">
                    <label for="cohorte">Cohorte de Ingreso <span class="req">*</span></label>
                    <input
                      id="cohorte"
                      type="text"
                      class="nexus-input"
                      placeholder="Ej. 2026-A"
                      formControlName="cohorte"
                    />
                    @if (registerForm.get('cohorte')?.invalid && registerForm.get('cohorte')?.touched) {
                      <span class="field-error">La cohorte es obligatoria.</span>
                    }
                  </div>

                  <div class="form-group">
                    <label for="programa_doctoral">Programa Doctoral</label>
                    <input
                      id="programa_doctoral"
                      type="text"
                      class="nexus-input"
                      placeholder="Doctorado en Ciencias Computacionales"
                      formControlName="programa_doctoral"
                    />
                  </div>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-nexus-outline" (click)="closeRegisterModal()" [disabled]="isSubmitting()">
                  Cancelar
                </button>
                <button type="submit" class="btn-nexus-primary" [disabled]="registerForm.invalid || isSubmitting()">
                  @if (isSubmitting()) {
                    <span>Guardando...</span>
                  } @else {
                    <span>Guardar Estudiante</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .students-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .page-header h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2C1867;
    }
    .subtitle {
      font-size: 0.875rem;
      color: #667085;
    }
    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .alert-success {
      background-color: #E9FEF1;
      color: #437E5C;
      border: 1px solid #437E5C;
    }
    .alert-danger {
      background-color: #FEE4E2;
      color: #B42318;
      border: 1px solid #FDA29B;
    }
    .alert-close {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: inherit;
    }
    .nexus-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .nexus-table th {
      padding: 12px 16px;
      background-color: #F5F7FB;
      font-size: 0.75rem;
      font-weight: 700;
      color: #667085;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #E4E7EC;
    }
    .nexus-table td {
      padding: 16px;
      font-size: 0.875rem;
      color: #344054;
      border-bottom: 1px solid #F2F4F7;
      vertical-align: middle;
    }
    .student-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .student-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #6365EF;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.8125rem;
    }
    .sub-matricula {
      display: block;
      font-size: 0.75rem;
      color: #667085;
      font-family: monospace;
    }
    .semester-pill {
      background-color: #EEEEFF;
      color: #6365EF;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.8125rem;
      text-decoration: none;
      display: inline-block;
    }

    /* Modal Styles */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 20px;
    }
    .modal-dialog {
      background: #FFFFFF;
      border-radius: 12px;
      width: 100%;
      max-width: 540px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: modalFadeIn 0.2s ease-out;
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: translateY(-12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid #E4E7EC;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-icon {
      font-size: 1.5rem;
    }
    .header-title h3 {
      font-size: 1.125rem;
      font-weight: 700;
      color: #2C1867;
      margin: 0;
    }
    .header-sub {
      font-size: 0.75rem;
      color: #667085;
      margin: 2px 0 0 0;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #98A2B3;
      padding: 0;
      line-height: 1;
    }
    .btn-close:hover {
      color: #344054;
    }
    .modal-body {
      padding: 24px;
    }
    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #344054;
    }
    .req {
      color: #D92D20;
    }
    .nexus-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #D0D5DD;
      border-radius: 8px;
      font-size: 0.875rem;
      color: #101828;
      background: #FFFFFF;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
    }
    .nexus-input:focus {
      border-color: #6365EF;
      box-shadow: 0 0 0 3px rgba(99, 101, 239, 0.15);
    }
    .field-error {
      font-size: 0.75rem;
      color: #D92D20;
    }
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #E4E7EC;
      background: #F9FAFB;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn-nexus-primary {
      background: #6365EF;
      color: #FFFFFF;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background-color 0.2s;
    }
    .btn-nexus-primary:hover:not(:disabled) {
      background: #4E50DC;
    }
    .btn-nexus-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-nexus-outline {
      background: #FFFFFF;
      color: #344054;
      border: 1px solid #D0D5DD;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .btn-nexus-outline:hover:not(:disabled) {
      background: #F9FAFB;
      border-color: #98A2B3;
    }
  `]
})
export class StudentsListComponent implements OnInit {
  private studentService = inject(StudentService);
  private fb = inject(FormBuilder);

  readonly students = signal<Student[]>([]);
  readonly isRegisterModalOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  registerForm: FormGroup = this.fb.group({
    matricula: ['', [Validators.required, Validators.minLength(4)]],
    nombre_completo: ['', [Validators.required, Validators.minLength(3)]],
    cohorte: ['2026-A', [Validators.required]],
    programa_doctoral: ['Doctorado en Ciencias Computacionales']
  });

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.studentService.getStudents().subscribe({
      next: res => {
        this.students.set(res?.results || []);
      },
      error: err => {
        console.error('Error cargando estudiantes:', err);
      }
    });
  }

  openRegisterModal(): void {
    this.registerForm.reset({
      matricula: '',
      nombre_completo: '',
      cohorte: '2026-A',
      programa_doctoral: 'Doctorado en Ciencias Computacionales'
    });
    this.errorMessage.set(null);
    this.isRegisterModalOpen.set(true);
  }

  closeRegisterModal(): void {
    this.isRegisterModalOpen.set(false);
  }

  submitRegister(): void {
    if (this.registerForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formVal = this.registerForm.value;
    const payload = {
      matricula: formVal.matricula.trim(),
      nombre_completo: formVal.nombre_completo.trim(),
      cohorte: formVal.cohorte.trim(),
      programa_doctoral: formVal.programa_doctoral?.trim() || 'Doctorado en Ciencias Computacionales',
      estatus_activo: true
    };

    this.studentService.createStudent(payload).subscribe({
      next: res => {
        this.isSubmitting.set(false);
        this.closeRegisterModal();
        this.successMessage.set(res.mensaje || 'Estudiante registrado correctamente.');
        this.loadStudents();
        setTimeout(() => this.successMessage.set(null), 5000);
      },
      error: err => {
        this.isSubmitting.set(false);
        const detail = err?.error?.detail || err?.error?.matricula?.[0] || 'Error al registrar estudiante.';
        this.errorMessage.set(detail);
      }
    });
  }
}
