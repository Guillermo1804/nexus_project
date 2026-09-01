import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError } from 'rxjs';
import {
  Publication,
  PublicationCreateRequest,
  PublicationCreateResponse,
  AcademicEvent,
  AcademicEventCreateRequest,
  AcademicEventCreateResponse,
  ResearchStay,
  ResearchStayCreateRequest,
  ResearchStayCreateResponse,
  OtherProduct,
  OtherProductCreateRequest,
  OtherProductCreateResponse
} from '../models/academic-output.model';

@Injectable({
  providedIn: 'root'
})
export class AcademicOutputService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/academic-output';

  // Signals
  readonly publications = signal<Publication[]>([]);
  readonly academicEvents = signal<AcademicEvent[]>([]);
  readonly researchStays = signal<ResearchStay[]>([]);
  readonly otherProducts = signal<OtherProduct[]>([]);
  readonly loading = signal<boolean>(false);

  // ================= PUBLICATIONS =================
  getPublications(params?: {
    student?: number | string;
    student_id?: number | string;
    semester?: number | string;
    tipo?: string;
    estado?: string;
  }): Observable<Publication[]> {
    this.loading.set(true);
    let httpParams = new HttpParams();
    if (params) {
      const studentVal = params.student || params.student_id;
      if (studentVal) httpParams = httpParams.set('student', studentVal.toString());
      if (params.semester) httpParams = httpParams.set('semester', params.semester.toString());
      if (params.tipo) httpParams = httpParams.set('tipo', params.tipo);
      if (params.estado) httpParams = httpParams.set('estado', params.estado);
    }

    return this.http.get<any>(`${this.baseUrl}/publications/`, { params: httpParams }).pipe(
      map(res => Array.isArray(res) ? res : (res.results || [])),
      tap(items => {
        this.publications.set(items);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  createPublication(data: PublicationCreateRequest): Observable<PublicationCreateResponse> {
    return this.http.post<PublicationCreateResponse>(`${this.baseUrl}/publications/`, data).pipe(
      tap(res => {
        if (res && res.publication) {
          this.publications.update(list => [res.publication, ...list]);
        }
      }),
      catchError(err => throwError(() => err))
    );
  }

  deletePublication(id: number): Observable<boolean> {
    return this.http.delete<{ details: string; success: boolean }>(`${this.baseUrl}/publications/${id}/`).pipe(
      map(res => res.success ?? true),
      tap(success => {
        if (success) {
          this.publications.update(list => list.filter(item => item.id !== id));
        }
      }),
      catchError(err => throwError(() => err))
    );
  }

  // ================= ACADEMIC EVENTS =================
  getAcademicEvents(params?: {
    student?: number | string;
    student_id?: number | string;
    semester?: number | string;
    tipo_evento?: string;
    modalidad?: string;
  }): Observable<AcademicEvent[]> {
    this.loading.set(true);
    let httpParams = new HttpParams();
    if (params) {
      const studentVal = params.student || params.student_id;
      if (studentVal) httpParams = httpParams.set('student', studentVal.toString());
      if (params.semester) httpParams = httpParams.set('semester', params.semester.toString());
      if (params.tipo_evento) httpParams = httpParams.set('tipo_evento', params.tipo_evento);
      if (params.modalidad) httpParams = httpParams.set('modalidad', params.modalidad);
    }

    return this.http.get<any>(`${this.baseUrl}/academic-events/`, { params: httpParams }).pipe(
      map(res => Array.isArray(res) ? res : (res.results || [])),
      tap(items => {
        this.academicEvents.set(items);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  createAcademicEvent(data: AcademicEventCreateRequest): Observable<AcademicEventCreateResponse> {
    return this.http.post<AcademicEventCreateResponse>(`${this.baseUrl}/academic-events/`, data).pipe(
      tap(res => {
        if (res && res.academic_event) {
          this.academicEvents.update(list => [res.academic_event, ...list]);
        }
      }),
      catchError(err => throwError(() => err))
    );
  }

  deleteAcademicEvent(id: number): Observable<boolean> {
    return this.http.delete<{ details: string; success: boolean }>(`${this.baseUrl}/academic-events/${id}/`).pipe(
      map(res => res.success ?? true),
      tap(success => {
        if (success) {
          this.academicEvents.update(list => list.filter(item => item.id !== id));
        }
      }),
      catchError(err => throwError(() => err))
    );
  }

  // ================= RESEARCH STAYS =================
  getResearchStays(params?: {
    student?: number | string;
    student_id?: number | string;
    semester?: number | string;
  }): Observable<ResearchStay[]> {
    this.loading.set(true);
    let httpParams = new HttpParams();
    if (params) {
      const studentVal = params.student || params.student_id;
      if (studentVal) httpParams = httpParams.set('student', studentVal.toString());
      if (params.semester) httpParams = httpParams.set('semester', params.semester.toString());
    }

    return this.http.get<any>(`${this.baseUrl}/research-stays/`, { params: httpParams }).pipe(
      map(res => Array.isArray(res) ? res : (res.results || [])),
      tap(items => {
        this.researchStays.set(items);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  createResearchStay(data: ResearchStayCreateRequest): Observable<ResearchStayCreateResponse> {
    return this.http.post<ResearchStayCreateResponse>(`${this.baseUrl}/research-stays/`, data).pipe(
      tap(res => {
        if (res && res.research_stay) {
          this.researchStays.update(list => [res.research_stay, ...list]);
        }
      }),
      catchError(err => throwError(() => err))
    );
  }

  deleteResearchStay(id: number): Observable<boolean> {
    return this.http.delete<{ details: string; success: boolean }>(`${this.baseUrl}/research-stays/${id}/`).pipe(
      map(res => res.success ?? true),
      tap(success => {
        if (success) {
          this.researchStays.update(list => list.filter(item => item.id !== id));
        }
      }),
      catchError(err => throwError(() => err))
    );
  }

  // ================= OTHER PRODUCTS =================
  getOtherProducts(params?: {
    student?: number | string;
    student_id?: number | string;
    semester?: number | string;
    tipo_producto?: string;
  }): Observable<OtherProduct[]> {
    this.loading.set(true);
    let httpParams = new HttpParams();
    if (params) {
      const studentVal = params.student || params.student_id;
      if (studentVal) httpParams = httpParams.set('student', studentVal.toString());
      if (params.semester) httpParams = httpParams.set('semester', params.semester.toString());
      if (params.tipo_producto) httpParams = httpParams.set('tipo_producto', params.tipo_producto);
    }

    return this.http.get<any>(`${this.baseUrl}/other-products/`, { params: httpParams }).pipe(
      map(res => Array.isArray(res) ? res : (res.results || [])),
      tap(items => {
        this.otherProducts.set(items);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  createOtherProduct(data: OtherProductCreateRequest): Observable<OtherProductCreateResponse> {
    return this.http.post<OtherProductCreateResponse>(`${this.baseUrl}/other-products/`, data).pipe(
      tap(res => {
        if (res && res.other_product) {
          this.otherProducts.update(list => [res.other_product, ...list]);
        }
      }),
      catchError(err => throwError(() => err))
    );
  }

  deleteOtherProduct(id: number): Observable<boolean> {
    return this.http.delete<{ details: string; success: boolean }>(`${this.baseUrl}/other-products/${id}/`).pipe(
      map(res => res.success ?? true),
      tap(success => {
        if (success) {
          this.otherProducts.update(list => list.filter(item => item.id !== id));
        }
      }),
      catchError(err => throwError(() => err))
    );
  }
}
