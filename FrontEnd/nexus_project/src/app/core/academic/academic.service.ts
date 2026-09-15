import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/pagination';
import { StudentRecord, TutoringSession, TutoringSessionData, Semester, CreateSemesterData, StudentOverview, Agreement, Evidence, EvidenceUploadData } from './academic.models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AcademicService {
  constructor(private readonly http: HttpClient) {}

  getStudentRecord(studentId: number): Observable<StudentRecord> {
    return this.http.get<StudentRecord>(`${API}/students/${studentId}/overview/`);
  }

  getStudentOverview(studentId: number): Observable<StudentOverview> {
    return this.http.get<StudentOverview>(`${API}/students/${studentId}/overview/`);
  }

  createTutoringSession(data: TutoringSessionData): Observable<TutoringSession> {
    return this.http.post<TutoringSession>(`${API}/tutoring-sessions/`, data);
  }

  getAgreements(filters: { page?: number; student?: number; estado?: string; vencido?: boolean } = {}): Observable<PaginatedResponse<Agreement>> {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]));
    return this.http.get<PaginatedResponse<Agreement>>(`${API}/agreements/?${query}`);
  }

  getGlobalOverview(page = 1): Observable<PaginatedResponse<StudentRecord>> {
    return this.http.get<PaginatedResponse<StudentRecord>>(`${API}/academic/overview/?page=${page}`);
  }

  getStudentSemesters(studentId: number): Observable<Semester[]> {
    return this.http.get<Semester[]>(`${API}/students/${studentId}/semesters/`);
  }

  createSemester(studentId: number, data: CreateSemesterData): Observable<Semester> {
    return this.http.post<Semester>(`${API}/students/${studentId}/semesters/`, data);
  }

  uploadEvidence(data: EvidenceUploadData): Observable<Evidence> {
    const form = new FormData();
    form.append('student', String(data.student));
    if (data.semester !== null) form.append('semester', String(data.semester));
    form.append('actividad_tipo', data.actividad_tipo);
    form.append('titulo', data.titulo);
    form.append('archivo_adjunto', data.archivo_adjunto);
    return this.http.post<Evidence>(`${API}/evidence/`, form);
  }
}