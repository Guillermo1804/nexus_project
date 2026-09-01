import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError } from 'rxjs';
import {
  Agreement,
  AgreementStatus,
  AgreementCreateRequest,
  AgreementStatusUpdateRequest,
  AgreementAuditLog,
  AgreementFilterParams
} from '../models/agreement.model';
import { PaginatedResponse } from '../models/student.model';

@Injectable({
  providedIn: 'root'
})
export class AgreementService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/agreements';

  // Signals reactivos
  readonly agreements = signal<Agreement[]>([]);
  readonly selectedAgreement = signal<Agreement | null>(null);
  readonly loading = signal<boolean>(false);
  readonly totalCount = signal<number>(0);

  /**
   * Normaliza una entidad Agreement para asegurar compatibilidad bidireccional
   * con nombres snake_case y camelCase.
   */
  private normalizeAgreement(agr: any): Agreement {
    const raw = { ...agr };
    const normalized: Agreement = {
      id: raw.id,
      student: raw.student || raw.studentId || 0,
      student_nombre: raw.student_nombre || raw.studentName || '',
      student_matricula: raw.student_matricula || raw.studentMatricula || '',
      session: raw.session !== undefined ? raw.session : raw.tutoringSessionId,
      descripcion: raw.descripcion || raw.description || raw.title || '',
      responsable: raw.responsable || raw.responsibleId || 0,
      responsable_nombre: raw.responsable_nombre || raw.responsibleName || '',
      responsable_email: raw.responsable_email || '',
      fecha_limite: raw.fecha_limite || raw.dueDate || '',
      estado: (raw.estado || raw.status || 'PENDIENTE') as AgreementStatus,
      estado_display: raw.estado_display || '',
      fecha_conclusion: raw.fecha_conclusion !== undefined ? raw.fecha_conclusion : raw.completionDate,
      created_by: raw.created_by,
      created_by_nombre: raw.created_by_nombre,
      created_at: raw.created_at || raw.createdAt || new Date().toISOString(),
      updated_at: raw.updated_at || raw.updatedAt || new Date().toISOString(),
      is_vencido: raw.is_vencido !== undefined ? raw.is_vencido : raw.isOverdue,
      audit_logs: raw.audit_logs || [],

      // Aliases UI
      studentId: raw.student || raw.studentId,
      studentName: raw.student_nombre || raw.studentName,
      studentMatricula: raw.student_matricula || raw.studentMatricula,
      tutoringSessionId: raw.session || raw.tutoringSessionId,
      description: raw.descripcion || raw.description,
      responsibleId: raw.responsable || raw.responsibleId,
      responsibleName: raw.responsable_nombre || raw.responsibleName,
      dueDate: raw.fecha_limite || raw.dueDate,
      status: (raw.estado || raw.status || 'PENDIENTE') as AgreementStatus,
      completionDate: raw.fecha_conclusion || raw.completionDate,
      isOverdue: raw.is_vencido !== undefined ? raw.is_vencido : raw.isOverdue,
      createdAt: raw.created_at || raw.createdAt,
      updatedAt: raw.updated_at || raw.updatedAt
    };
    return normalized;
  }

  getAgreements(params?: AgreementFilterParams | {
    studentId?: number | string;
    status?: AgreementStatus;
    semester?: number;
    search?: string;
  }): Observable<Agreement[]> {
    this.loading.set(true);
    let httpParams = new HttpParams();

    if (params) {
      const p = params as any;
      const studentVal = p.student || p.studentId || p.student_id;
      if (studentVal) {
        httpParams = httpParams.set('student', studentVal.toString());
      }
      const estadoVal = p.estado || p.status;
      if (estadoVal && estadoVal !== 'TODOS') {
        httpParams = httpParams.set('estado', estadoVal.toString());
      }
      const respVal = p.responsable || p.responsable_id;
      if (respVal) {
        httpParams = httpParams.set('responsable', respVal.toString());
      }
      const sessVal = p.session || p.session_id || p.tutoringSessionId;
      if (sessVal) {
        httpParams = httpParams.set('session', sessVal.toString());
      }
      if (p.search) {
        httpParams = httpParams.set('search', p.search);
      }
    }

    return this.http.get<any>(`${this.baseUrl}/`, { params: httpParams }).pipe(
      map(response => {
        const rawList = Array.isArray(response)
          ? response
          : (response.results || []);
        return rawList.map((item: any) => this.normalizeAgreement(item));
      }),
      tap(items => {
        this.agreements.set(items);
        this.totalCount.set(items.length);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  getAgreementById(id: number): Observable<Agreement> {
    this.loading.set(true);
    return this.http.get<any>(`${this.baseUrl}/${id}/`).pipe(
      map(raw => this.normalizeAgreement(raw)),
      tap(item => {
        this.selectedAgreement.set(item);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  createAgreement(data: AgreementCreateRequest): Observable<Agreement> {
    this.loading.set(true);
    return this.http.post<any>(`${this.baseUrl}/`, data).pipe(
      map(raw => {
        const agreementObj = raw.agreement || raw;
        return this.normalizeAgreement(agreementObj);
      }),
      tap(created => {
        this.loading.set(false);
        this.agreements.update(list => [created, ...list]);
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  updateAgreementStatus(id: number, data: AgreementStatusUpdateRequest): Observable<Agreement> {
    this.loading.set(true);
    return this.http.patch<any>(`${this.baseUrl}/${id}/status/`, data).pipe(
      map(raw => {
        const agreementObj = raw.agreement || raw;
        return this.normalizeAgreement(agreementObj);
      }),
      tap(updated => {
        this.loading.set(false);
        this.agreements.update(list => list.map(a => a.id === updated.id ? updated : a));
        if (this.selectedAgreement()?.id === updated.id) {
          this.selectedAgreement.set(updated);
        }
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  getAgreementAuditLogs(id: number): Observable<AgreementAuditLog[]> {
    return this.http.get<AgreementAuditLog[]>(`${this.baseUrl}/${id}/audit-logs/`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  getAuditLogs(id: number): Observable<AgreementAuditLog[]> {
    return this.getAgreementAuditLogs(id);
  }
}

