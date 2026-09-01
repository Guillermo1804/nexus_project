import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError } from 'rxjs';
import {
  ThesisProgress,
  ThesisProgressCreateRequest,
  ThesisProgressCreateResponse,
  ThesisHistoryResponse
} from '../models/thesis.model';

@Injectable({
  providedIn: 'root'
})
export class ThesisService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/thesis';

  readonly progressList = signal<ThesisProgress[]>([]);
  readonly latestProgress = signal<ThesisProgress | null>(null);
  readonly historyData = signal<ThesisHistoryResponse | null>(null);
  readonly loading = signal<boolean>(false);

  private normalizeThesisProgress(raw: any): ThesisProgress {
    const defaultComponents = {
      protocolo: 0,
      estadoArte: 0,
      marcoTeorico: 0,
      metodologia: 0,
      analisis: 0,
      redaccion: 0
    };

    return {
      id: raw.id,
      student: raw.student || raw.studentId || 0,
      student_nombre: raw.student_nombre || raw.studentName || '',
      student_matricula: raw.student_matricula || raw.studentMatricula || '',
      semester: raw.semester || raw.semesterId || 0,
      semester_numero: raw.semester_numero ?? raw.semesterNumero ?? 1,
      porcentaje_avance: raw.porcentaje_avance ?? raw.currentPercentage ?? raw.percentage ?? 0,
      componentes_json: raw.componentes_json || raw.components || defaultComponents,
      observaciones: raw.observaciones || raw.summary || raw.observations || '',
      fecha_registro: raw.fecha_registro || raw.registrationDate || new Date().toISOString().split('T')[0],
      created_at: raw.created_at || raw.createdAt || new Date().toISOString(),
      updated_at: raw.updated_at || raw.updatedAt || new Date().toISOString(),

      // Aliases
      studentId: raw.student || raw.studentId,
      studentName: raw.student_nombre || raw.studentName,
      studentMatricula: raw.student_matricula || raw.studentMatricula,
      semesterId: raw.semester || raw.semesterId,
      semesterNumero: raw.semester_numero ?? raw.semesterNumero,
      currentPercentage: raw.porcentaje_avance ?? raw.currentPercentage ?? raw.percentage ?? 0,
      percentage: raw.porcentaje_avance ?? raw.currentPercentage ?? raw.percentage ?? 0,
      components: raw.componentes_json || raw.components || defaultComponents,
      summary: raw.observaciones || raw.summary || raw.observations || '',
      observations: raw.observaciones || raw.summary || raw.observations || '',
      registrationDate: raw.fecha_registro || raw.registrationDate
    };
  }

  getThesisProgresses(params?: {
    student?: number | string;
    studentId?: number | string;
    semester?: number | string;
  }): Observable<ThesisProgress[]> {
    this.loading.set(true);
    let httpParams = new HttpParams();

    if (params) {
      const studentVal = params.student || params.studentId;
      if (studentVal) {
        httpParams = httpParams.set('student', studentVal.toString());
      }
      if (params.semester) {
        httpParams = httpParams.set('semester', params.semester.toString());
      }
    }

    return this.http.get<any>(`${this.baseUrl}/`, { params: httpParams }).pipe(
      map(response => {
        const rawList = Array.isArray(response)
          ? response
          : (response.results || []);
        return rawList.map((item: any) => this.normalizeThesisProgress(item));
      }),
      tap(items => {
        this.progressList.set(items);
        this.latestProgress.set(items.length > 0 ? items[0] : null);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  getThesisProgressById(id: number): Observable<ThesisProgress> {
    this.loading.set(true);
    return this.http.get<any>(`${this.baseUrl}/${id}/`).pipe(
      map(raw => this.normalizeThesisProgress(raw)),
      tap(() => this.loading.set(false)),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  createThesisProgress(data: ThesisProgressCreateRequest): Observable<ThesisProgressCreateResponse> {
    this.loading.set(true);
    return this.http.post<ThesisProgressCreateResponse>(`${this.baseUrl}/`, data).pipe(
      tap(res => {
        this.loading.set(false);
        if (res && res.thesis_progress) {
          const normalized = this.normalizeThesisProgress(res.thesis_progress);
          this.progressList.update(list => [normalized, ...list]);
          this.latestProgress.set(normalized);
        }
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  getThesisHistory(studentId: number | string): Observable<ThesisHistoryResponse> {
    this.loading.set(true);
    const params = new HttpParams().set('student_id', studentId.toString());

    return this.http.get<ThesisHistoryResponse>(`${this.baseUrl}/history/`, { params }).pipe(
      tap(data => {
        this.historyData.set(data);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }
}
