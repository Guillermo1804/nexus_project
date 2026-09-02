import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import {
  Student,
  StudentDetail,
  Semester,
  StudentCreateRequest,
  StudentCreateResponse,
  SemesterCreateRequest,
  SemesterCreateResponse,
  DeleteResponse,
  PaginatedResponse
} from '../models/student.model';
import { TutoringSession } from '../models/tutoring.model';
import { Agreement } from '../models/agreement.model';
import { ThesisProgress } from '../models/thesis.model';
import { TimelineNode } from '../models/timeline.model';

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1';

  // Signals
  readonly students = signal<Student[]>([]);
  readonly selectedStudent = signal<StudentDetail | Student | null>(null);
  readonly loading = signal<boolean>(false);
  readonly totalCount = signal<number>(0);

  getStudents(page: number = 1, search?: string): Observable<PaginatedResponse<Student>> {
    this.loading.set(true);
    let params = new HttpParams().set('page', page.toString());
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<PaginatedResponse<Student>>(`${this.baseUrl}/students/`, { params }).pipe(
      tap(res => {
        this.students.set(res.results || []);
        this.totalCount.set(res.count || 0);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  getStudentDetail(id: number | string): Observable<StudentDetail> {
    this.loading.set(true);
    return this.http.get<StudentDetail>(`${this.baseUrl}/students/${id}/`).pipe(
      tap(student => {
        this.selectedStudent.set(student);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  getStudentById(id: number | string): Observable<Student> {
    return this.http.get<Student>(`${this.baseUrl}/students/${id}/`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  createStudent(data: StudentCreateRequest): Observable<StudentCreateResponse> {
    this.loading.set(true);
    return this.http.post<StudentCreateResponse>(`${this.baseUrl}/students/`, data).pipe(
      tap(response => {
        this.loading.set(false);
        if (response.student) {
          this.students.update(list => [response.student!, ...list]);
        }
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  updateStudent(id: number | string, data: Partial<Student>): Observable<Student> {
    this.loading.set(true);
    return this.http.patch<Student>(`${this.baseUrl}/students/${id}/`, data).pipe(
      tap(updated => {
        this.loading.set(false);
        this.students.update(list => list.map(s => s.id === updated.id ? updated : s));
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  deleteStudent(id: number | string): Observable<DeleteResponse> {
    this.loading.set(true);
    return this.http.delete<DeleteResponse>(`${this.baseUrl}/students/${id}/`).pipe(
      tap(() => {
        this.loading.set(false);
        this.students.update(list => list.filter(s => s.id !== Number(id)));
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  getStudentSemesters(studentId: number | string): Observable<Semester[]> {
    return this.http.get<Semester[]>(`${this.baseUrl}/students/${studentId}/semesters/`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  createSemester(studentId: number | string, data: SemesterCreateRequest): Observable<SemesterCreateResponse> {
    return this.http.post<SemesterCreateResponse>(`${this.baseUrl}/students/${studentId}/semesters/`, data);
  }

  deleteSemester(semesterId: number | string): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.baseUrl}/students/semesters/${semesterId}/`);
  }

  getTutoringSessions(studentId: number | string, semester?: number): Observable<TutoringSession[]> {
    let url = `${this.baseUrl}/tutoring-sessions/?student=${studentId}`;
    if (semester) {
      url += `&semester=${semester}`;
    }
    return this.http.get<{ results: TutoringSession[] } | TutoringSession[]>(url).pipe(
      map(res => Array.isArray(res) ? res : res.results || []),
      catchError(err => throwError(() => err))
    );
  }

  getAgreements(studentId: number | string, semester?: number): Observable<Agreement[]> {
    let url = `${this.baseUrl}/agreements/?student=${studentId}`;
    if (semester) {
      url += `&semester=${semester}`;
    }
    return this.http.get<{ results: Agreement[] } | Agreement[]>(url).pipe(
      map(res => Array.isArray(res) ? res : res.results || []),
      catchError(err => throwError(() => err))
    );
  }

  getThesisProgress(studentId: number | string, semester?: number): Observable<ThesisProgress | null> {
    const url = `${this.baseUrl}/thesis/?student=${studentId}${semester ? `&semester=${semester}` : ''}`;
    return this.http.get<any>(url).pipe(
      map(res => {
        if (res && res.results && Array.isArray(res.results) && res.results.length > 0) {
          return res.results[0];
        }
        if (Array.isArray(res) && res.length > 0) {
          return res[0];
        }
        return res && !Array.isArray(res) && !res.results ? res : null;
      }),
      catchError(err => throwError(() => err))
    );
  }

  getStudentTimeline(studentId: number | string, semester?: number): Observable<TimelineNode[]> {
    const url = `${this.baseUrl}/monitoring/timeline/?student=${studentId}${semester ? `&semester=${semester}` : ''}`;
    return this.http.get<TimelineNode[]>(url).pipe(
      catchError(err => throwError(() => err))
    );
  }
}
