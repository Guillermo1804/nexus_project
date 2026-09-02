import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { FullDossier } from '../models/dossier.model';

@Injectable({
  providedIn: 'root'
})
export class ReportingService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/reporting';

  readonly dossier = signal<FullDossier | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly exporting = signal<boolean>(false);

  getFullDossier(studentId: number): Observable<FullDossier> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<FullDossier>(`${this.baseUrl}/students/${studentId}/full-dossier/`).pipe(
      tap(data => {
        this.dossier.set(data);
        this.loading.set(false);
      }),
      catchError(err => {
        this.loading.set(false);
        this.error.set(err.message || 'Error al obtener la cédula del expediente.');
        return throwError(() => err);
      })
    );
  }

  /**
   * Descarga el expediente del estudiante en formato Excel multi-hoja (.xlsx) o PDF institucional (.pdf) (HU-28).
   */
  exportStudentDossier(studentId: number, format: 'xlsx' | 'pdf' = 'xlsx'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/students/${studentId}/export/?format=${format}`, {
      responseType: 'blob'
    });
  }

  /**
   * Ejecuta la descarga en el navegador con el nombre de archivo correspondiente.
   */
  downloadStudentDossier(studentId: number, format: 'xlsx' | 'pdf' = 'xlsx', matricula?: string): void {
    this.exporting.set(true);
    this.exportStudentDossier(studentId, format).subscribe({
      next: (blob) => {
        const extension = format === 'pdf' ? 'pdf' : 'xlsx';
        const filename = matricula ? `Expediente_${matricula}.${extension}` : `Expediente_Estudiante_${studentId}.${extension}`;
        this.triggerBlobDownload(blob, filename);
        this.exporting.set(false);
      },
      error: (err) => {
        console.error(`Error al exportar expediente en formato ${format}:`, err);
        this.exporting.set(false);
      }
    });
  }

  /**
   * Exporta el resumen general de la cohorte de estudiantes en Excel.
   */
  exportCohortSummary(format: 'xlsx' = 'xlsx'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export-students/?format=${format}`, {
      responseType: 'blob'
    });
  }

  /**
   * Ejecuta la descarga del listado general de cohorte en el navegador.
   */
  downloadCohortSummary(format: 'xlsx' = 'xlsx'): void {
    this.exporting.set(true);
    this.exportCohortSummary(format).subscribe({
      next: (blob) => {
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `Listado_Estudiantes_${timestamp}.xlsx`;
        this.triggerBlobDownload(blob, filename);
        this.exporting.set(false);
      },
      error: (err) => {
        console.error('Error al exportar cohorte:', err);
        this.exporting.set(false);
      }
    });
  }

  private triggerBlobDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }
}
