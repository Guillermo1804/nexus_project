import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { Semester } from '../models/student.model';

export interface AcademicPeriod {
  id: string;
  label: string;
  isCurrent: boolean;
  semesterNumber?: number;
  startDate?: string;
  endDate?: string;
}

const STORAGE_KEY = 'nexus_active_period';

@Injectable({
  providedIn: 'root'
})
export class PeriodService {
  private http = inject(HttpClient);

  readonly periods = signal<AcademicPeriod[]>([
    { id: 'TODOS', label: 'Todos los Ciclos', isCurrent: false }
  ]);

  readonly activePeriod = signal<string>(this.getInitialPeriod());
  readonly loading = signal<boolean>(false);

  private getInitialPeriod(): string {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return saved;
    } catch {
      // Ignore localStorage errors
    }
    return 'TODOS';
  }

  setPeriod(periodId: string): void {
    this.activePeriod.set(periodId);
    try {
      localStorage.setItem(STORAGE_KEY, periodId);
    } catch {
      // Ignore localStorage write errors
    }
  }

  /**
   * Carga dinámicamente los semestres del alumno desde /api/v1/semesters/?student_id={id}
   * o /api/v1/students/{id}/semesters/ y actualiza el signal reactivo de periodos.
   */
  loadStudentSemesters(studentId: number | string): Observable<AcademicPeriod[]> {
    this.loading.set(true);
    return this.http.get<Semester[]>(`/api/v1/students/${studentId}/semesters/`).pipe(
      map(semesters => {
        const list: AcademicPeriod[] = [
          { id: 'TODOS', label: 'Todos los Ciclos', isCurrent: false }
        ];

        if (Array.isArray(semesters)) {
          semesters.forEach(s => {
            const num = s.numero || s.number || 1;
            const isCurrent = !!(s.is_active || s.isCurrent);
            const label = `Semestre ${num}${isCurrent ? ' (Actual)' : ''}`;
            list.push({
              id: String(num),
              label,
              isCurrent,
              semesterNumber: num,
              startDate: s.fecha_inicio,
              endDate: s.fecha_fin
            });
          });
        }
        return list;
      }),
      tap(periodsList => {
        this.periods.set(periodsList);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }
}
