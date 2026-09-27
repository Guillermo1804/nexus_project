import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/pagination';
<<<<<<< HEAD
import {
  StudentRecord,
  TutoringSession,
  TutoringSessionData,
  Semester,
  CreateSemesterData,
  StudentOverview,
  Agreement,
  AgreementFilters,
  AgreementAuditEntry,
  CreateSessionAgreementData,
  Evidence,
  EvidenceUploadData,
  TutoringObservation,
  CreateTutoringObservationData,
} from './academic.models';
=======
import { StudentRecord, TutoringSession, TutoringSessionData, Semester, CreateSemesterData, StudentOverview, Agreement, ParticipanteTutoria, DatosParticipanteTutoria } from './academic.models';
>>>>>>> origin/HU-08-registrar-asistencia-participantes

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

<<<<<<< HEAD
  getTutoringSessions(page = 1): Observable<PaginatedResponse<TutoringSession>> {
    return this.http.get<PaginatedResponse<TutoringSession>>(`${API}/tutoring-sessions/?page=${page}`);
  }

  getSessionObservations(sessionId: number): Observable<TutoringObservation[]> {
    return this.http.get<TutoringObservation[]>(`${API}/tutoring-sessions/${sessionId}/observations/`);
  }

  createSessionObservation(
    sessionId: number,
    data: CreateTutoringObservationData,
  ): Observable<TutoringObservation> {
    return this.http.post<TutoringObservation>(`${API}/tutoring-sessions/${sessionId}/observations/`, data);
  }

  getSessionAgreements(sessionId: number): Observable<Agreement[]> {
    return this.http.get<Agreement[]>(`${API}/tutoring-sessions/${sessionId}/agreements/`);
  }

  createSessionAgreement(sessionId: number, data: CreateSessionAgreementData): Observable<Agreement> {
    return this.http.post<Agreement>(`${API}/tutoring-sessions/${sessionId}/agreements/`, data);
  }

  updateAgreementStatus(agreementId: number, estado: 'EN_PROCESO' | 'CONCLUIDO', comentario = ''): Observable<Agreement> {
    return this.http.patch<Agreement>(`${API}/agreements/${agreementId}/status/`, { estado, comentario });
  }

  getAgreements(filters: AgreementFilters = {}): Observable<PaginatedResponse<Agreement>> {
    const query = new URLSearchParams(
      Object.entries(filters)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => [key, String(value)]),
    );
=======
  getParticipantesTutoria(tutoriaId: number): Observable<ParticipanteTutoria[]> {
  return this.http.get<ParticipanteTutoria[]>(`${API}/tutoring-sessions/${tutoriaId}/participants/`);
  }

  registrarParticipanteTutoria(tutoriaId: number, datos: DatosParticipanteTutoria): Observable<ParticipanteTutoria> {
  return this.http.post<ParticipanteTutoria>(`${API}/tutoring-sessions/${tutoriaId}/participants/`, datos);
  }

  getAgreements(filters: { page?: number; student?: number; estado?: string; vencido?: boolean } = {}): Observable<PaginatedResponse<Agreement>> {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]));
>>>>>>> origin/HU-08-registrar-asistencia-participantes
    return this.http.get<PaginatedResponse<Agreement>>(`${API}/agreements/?${query}`);
  }

  getAgreementAuditLog(agreementId: number): Observable<AgreementAuditEntry[]> {
    return this.http.get<AgreementAuditEntry[]>(`${API}/agreements/${agreementId}/audit-log/`);
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
<<<<<<< HEAD

  uploadEvidence(data: EvidenceUploadData): Observable<Evidence> {
    const form = new FormData();
    form.append('student', String(data.student));
    if (data.semester !== null) form.append('semester', String(data.semester));
    form.append('actividad_tipo', data.actividad_tipo);
    form.append('titulo', data.titulo);
    form.append('archivo_adjunto', data.archivo_adjunto);
    return this.http.post<Evidence>(`${API}/evidence/`, form);
  }
=======
>>>>>>> origin/HU-08-registrar-asistencia-participantes
}
