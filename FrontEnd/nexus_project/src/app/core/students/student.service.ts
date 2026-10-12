import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/pagination';
import { StudentRecord } from '../academic/academic.models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly http = inject(HttpClient);

  readonly students = signal<StudentRecord[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  getStudents(page = 1): Observable<PaginatedResponse<StudentRecord>> {
    return this.http.get<PaginatedResponse<StudentRecord>>(`${API}/students/?page=${page}`);
  }

  loadStudents(): void {
    this.loading.set(true);
    this.error.set(null);
    this.getStudents()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.students.set(data.results),
        error: (err) => {
          this.error.set(err.message || 'Error al cargar estudiantes');
          this.students.set([]);
        },
      });
  }
}
