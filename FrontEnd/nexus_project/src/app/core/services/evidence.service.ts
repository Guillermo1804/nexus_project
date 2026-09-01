import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap, catchError, throwError } from 'rxjs';
import {
  Evidence,
  EvidenceCreateResponse,
  EvidenceFilterParams,
  EvidenceType,
  EvidenceActivityType
} from '../models/evidence.model';

@Injectable({
  providedIn: 'root'
})
export class EvidenceService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/evidence';

  readonly evidences = signal<Evidence[]>([]);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isSubmitting = signal<boolean>(false);

  private normalizeEvidence(raw: any): Evidence {
    return {
      id: raw.id,
      student: raw.student || raw.studentId || 0,
      student_nombre: raw.student_nombre || raw.studentName || '',
      student_matricula: raw.student_matricula || raw.studentMatricula || '',
      semester: raw.semester || raw.semesterId || null,
      semester_numero: raw.semester_numero ?? raw.semesterNumber ?? null,
      tipo: raw.tipo || raw.type || 'ARCHIVO_LOCAL',
      tipo_display: raw.tipo_display || (raw.tipo === 'ENLACE_DOI' ? 'Enlace DOI/URL' : 'Archivo Local'),
      actividad_tipo: raw.actividad_tipo || raw.activityType || 'OTRO',
      actividad_tipo_display: raw.actividad_tipo_display || raw.actividad_tipo || 'Otro',
      actividad_id: raw.actividad_id || raw.activityId || null,
      titulo: raw.titulo || raw.title || '',
      descripcion: raw.descripcion || raw.description || '',
      archivo_adjunto: raw.archivo_adjunto,
      archivo_url: raw.archivo_url || raw.fileUrl || (raw.archivo_adjunto ? raw.archivo_adjunto : null),
      enlace_url: raw.enlace_url || raw.url || raw.doiUrl || raw.url_doi || '',
      mime_type: raw.mime_type || raw.mimeType || '',
      file_size_bytes: raw.file_size_bytes || raw.fileSizeBytes || raw.size || 0,
      fecha_carga: raw.fecha_carga || raw.uploadDate || new Date().toISOString().split('T')[0],
      created_by: raw.created_by || raw.cargado_por,
      created_by_nombre: raw.created_by_nombre || raw.cargado_por_nombre,
      created_at: raw.created_at || raw.createdAt || new Date().toISOString(),

      // Aliases
      studentId: raw.student || raw.studentId,
      studentName: raw.student_nombre || raw.studentName,
      studentMatricula: raw.student_matricula || raw.studentMatricula,
      semesterId: raw.semester || raw.semesterId,
      semesterNumber: raw.semester_numero ?? raw.semesterNumber,
      type: raw.tipo || raw.type || 'ARCHIVO_LOCAL',
      activityType: raw.actividad_tipo || raw.activityType || 'OTRO',
      activityId: raw.actividad_id || raw.activityId,
      title: raw.titulo || raw.title,
      description: raw.descripcion || raw.description,
      fileUrl: raw.archivo_url || raw.fileUrl,
      url: raw.enlace_url || raw.url || raw.url_doi,
      doiUrl: raw.enlace_url || raw.doiUrl || raw.url_doi,
      mimeType: raw.mime_type || raw.mimeType,
      fileSizeBytes: raw.file_size_bytes || raw.fileSizeBytes,
      size: raw.file_size_bytes || raw.size,
      uploadDate: raw.fecha_carga || raw.uploadDate,
      createdAt: raw.created_at || raw.createdAt
    };
  }

  getEvidences(params?: EvidenceFilterParams): Observable<Evidence[]> {
    this.loading.set(true);
    let httpParams = new HttpParams();

    if (params) {
      const studentVal = params.student || params.studentId;
      if (studentVal) {
        httpParams = httpParams.set('student', studentVal.toString());
      }
      if (params.actividad_tipo) {
        httpParams = httpParams.set('actividad_tipo', params.actividad_tipo);
      }
      if (params.actividad_id) {
        httpParams = httpParams.set('actividad_id', params.actividad_id.toString());
      }
      if (params.tipo) {
        httpParams = httpParams.set('tipo', params.tipo);
      }
      if (params.semester) {
        httpParams = httpParams.set('semester', params.semester.toString());
      }
      if (params.search) {
        httpParams = httpParams.set('search', params.search);
      }
    }

    return this.http.get<any>(`${this.baseUrl}/`, { params: httpParams }).pipe(
      map(response => {
        const rawList = Array.isArray(response)
          ? response
          : (response.results || []);
        return rawList.map((item: any) => this.normalizeEvidence(item));
      }),
      tap(items => {
        this.evidences.set(items);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        this.errorMessage.set(err.message || 'Error al cargar evidencias');
        return throwError(() => err);
      })
    );
  }

  getEvidenceById(id: number): Observable<Evidence> {
    this.loading.set(true);
    return this.http.get<any>(`${this.baseUrl}/${id}/`).pipe(
      map(raw => this.normalizeEvidence(raw)),
      tap(() => this.loading.set(false)),
      catchError(err => {
        this.loading.set(false);
        return throwError(() => err);
      })
    );
  }

  uploadFileEvidence(
    studentOrData: number | any,
    file?: File,
    title?: string,
    activityType: EvidenceActivityType = 'OTRO',
    activityId?: number,
    semesterId?: number,
    description: string = ''
  ): Observable<EvidenceCreateResponse> {
    this.isSubmitting.set(true);
    const formData = new FormData();

    if (typeof studentOrData === 'object') {
      const d = studentOrData;
      formData.append('student', String(d.student || d.studentId));
      formData.append('tipo', 'ARCHIVO_LOCAL');
      formData.append('titulo', d.titulo || d.title);
      formData.append('archivo_adjunto', d.archivo || d.file);
      formData.append('actividad_tipo', d.actividad_tipo || d.activityType || 'OTRO');
      if (d.actividad_id || d.activityId) formData.append('actividad_id', String(d.actividad_id || d.activityId));
      if (d.semester || d.semesterId) formData.append('semester', String(d.semester || d.semesterId));
      if (d.descripcion || d.description) formData.append('descripcion', d.descripcion || d.description);
    } else {
      formData.append('student', studentOrData.toString());
      formData.append('tipo', 'ARCHIVO_LOCAL');
      formData.append('titulo', title || '');
      if (file) formData.append('archivo_adjunto', file);
      formData.append('actividad_tipo', activityType);
      if (activityId) formData.append('actividad_id', activityId.toString());
      if (semesterId) formData.append('semester', semesterId.toString());
      if (description) formData.append('descripcion', description);
    }

    return this.http.post<EvidenceCreateResponse>(`${this.baseUrl}/`, formData).pipe(
      tap(res => {
        this.isSubmitting.set(false);
        if (res && res.evidence) {
          const normalized = this.normalizeEvidence(res.evidence);
          this.evidences.update(list => [normalized, ...list]);
        }
      }),
      catchError(err => {
        this.isSubmitting.set(false);
        return throwError(() => err);
      })
    );
  }

  createDoiEvidence(
    studentOrData: number | any,
    doiUrl?: string,
    title?: string,
    activityType: EvidenceActivityType = 'OTRO',
    activityId?: number,
    semesterId?: number,
    description: string = ''
  ): Observable<EvidenceCreateResponse> {
    this.isSubmitting.set(true);
    let payload: any;

    if (typeof studentOrData === 'object') {
      const d = studentOrData;
      payload = {
        student: d.student || d.studentId,
        tipo: 'ENLACE_DOI',
        titulo: d.titulo || d.title,
        enlace_url: d.enlace_url || d.doiUrl || d.url || '',
        url_doi: d.enlace_url || d.doiUrl || d.url || '',
        actividad_tipo: d.actividad_tipo || d.activityType || 'OTRO',
        actividad_id: d.actividad_id || d.activityId || null,
        semester: d.semester || d.semesterId || null,
        descripcion: d.descripcion || d.description || ''
      };
    } else {
      payload = {
        student: studentOrData,
        tipo: 'ENLACE_DOI',
        titulo: title || '',
        enlace_url: doiUrl || '',
        url_doi: doiUrl || '',
        actividad_tipo: activityType,
        actividad_id: activityId || null,
        semester: semesterId || null,
        descripcion: description
      };
    }

    return this.http.post<EvidenceCreateResponse>(`${this.baseUrl}/`, payload).pipe(
      tap(res => {
        this.isSubmitting.set(false);
        if (res && res.evidence) {
          const normalized = this.normalizeEvidence(res.evidence);
          this.evidences.update(list => [normalized, ...list]);
        }
      }),
      catchError(err => {
        this.isSubmitting.set(false);
        return throwError(() => err);
      })
    );
  }

  registerDoiEvidence(data: any): Observable<EvidenceCreateResponse> {
    return this.createDoiEvidence(data);
  }


  deleteEvidence(id: number): Observable<boolean> {
    return this.http.delete<{ details: string; success: boolean }>(`${this.baseUrl}/${id}/`).pipe(
      map(res => res.success ?? true),
      tap(success => {
        if (success) {
          this.evidences.update(list => list.filter(item => item.id !== id));
        }
      }),
      catchError(err => throwError(() => err))
    );
  }
}
