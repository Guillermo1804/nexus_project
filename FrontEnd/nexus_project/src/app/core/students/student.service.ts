import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StudentRecord } from '../academic/academic.models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly http = inject(HttpClient);

  readonly students = signal<StudentRecord[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  getStudents(): Observable<StudentRecord[]> {
    return this.http.get<StudentRecord[]>(`${API}/v1/students/`);
  }

  loadStudents(): void {
    this.loading.set(true);
    this.error.set(null);
    this.getStudents()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.students.set(data),
        error: (err) => {
          this.error.set(err.message || 'Error al cargar estudiantes');
          this.students.set([]);
        },
      });
  }
}
