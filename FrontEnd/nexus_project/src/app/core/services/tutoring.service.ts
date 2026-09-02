import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import {
  TutoringSession,
  TutoringSessionCreateRequest,
  TutoringSessionCreateResponse
} from '../models/tutoring.model';
import { DeleteResponse, PaginatedResponse } from '../models/student.model';

@Injectable({
  providedIn: 'root'
})
export class TutoringService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/tutoring-sessions';

  // Signals
  readonly sessions = signal<TutoringSession[]>([]);
  readonly selectedSession = signal<TutoringSession | null>(null);
  readonly loading = signal<boolean>(false);

  getSessions(studentId?: number | string, semesterId?: number | string): Observable<TutoringSession[]> {
    this.loading.set(true);
    let params = new HttpParams();
    if (studentId) {
      params = params.set('student', studentId.toString());
    }
    if (semesterId) {
      params = params.set('semester', semesterId.toString());
    }

    return this.http.get<PaginatedResponse<TutoringSession> | TutoringSession[]>(`${this.baseUrl}/`, { params }).pipe(
      map(res => {
        if (Array.isArray(res)) {
          return res;
        }
        return res.results || [];
      }),
      tap(sessions => {
        this.sessions.set(sessions);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        return of([]);
      })
    );
  }

  getSessionDetail(id: number | string): Observable<TutoringSession> {
    this.loading.set(true);
    return this.http.get<TutoringSession>(`${this.baseUrl}/${id}/`).pipe(
      tap(session => {
        this.selectedSession.set(session);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  createSession(data: TutoringSessionCreateRequest): Observable<TutoringSessionCreateResponse> {
    this.loading.set(true);
    return this.http.post<TutoringSessionCreateResponse>(`${this.baseUrl}/`, data).pipe(
      tap(response => {
        this.loading.set(false);
        if (response.tutoring_session) {
          this.sessions.update(list => [response.tutoring_session, ...list]);
        }
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  deleteSession(id: number | string): Observable<DeleteResponse> {
    this.loading.set(true);
    return this.http.delete<DeleteResponse>(`${this.baseUrl}/${id}/`).pipe(
      tap(() => {
        this.loading.set(false);
        this.sessions.update(list => list.filter(s => s.id !== Number(id)));
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }
}
