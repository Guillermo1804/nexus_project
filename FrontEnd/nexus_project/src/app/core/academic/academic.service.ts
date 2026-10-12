import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../../shared/pagination';
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
  AgreementAlertsResponse,
  CreateSessionAgreementData,
  Evidence,
  EvidenceLinkData,
  EvidenceUploadData,
  TutoringObservation,
  CreateTutoringObservationData,
  ParticipanteTutoria,
  DatosParticipanteTutoria,
  UpdateNextMeetingData,
  ThesisProgress,
  CreateThesisProgressData,
  TimelineResponse,
} from './academic.models';

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

  getTimeline(studentId: number): Observable<TimelineResponse> {
    return this.http.get<TimelineResponse>(`${API}/monitoring/timeline/?student=${studentId}`);
  }

  createTutoringSession(data: TutoringSessionData): Observable<TutoringSession> {
    return this.http.post<TutoringSession>(`${API}/tutoring-sessions/`, data);
  }

  updateNextMeeting(sessionId: number, data: UpdateNextMeetingData): Observable<TutoringSession> {
    return this.http.patch<TutoringSession>(`${API}/tutoring-sessions/${sessionId}/`, data);
  }

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

  getAgreementAlerts(studentId?: number): Observable<AgreementAlertsResponse> {
    const query = studentId ? `?student=${studentId}` : '';
    return this.http.get<AgreementAlertsResponse>(`${API}/monitoring/alerts/agreements/${query}`);
  }

  getAgreements(filters: AgreementFilters = {}): Observable<PaginatedResponse<Agreement>> {
    const query = new URLSearchParams(
      Object.entries(filters)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => [key, String(value)]),
    );
    return this.http.get<PaginatedResponse<Agreement>>(`${API}/agreements/?${query}`);
  }

  getParticipantesTutoria(tutoriaId: number): Observable<ParticipanteTutoria[]> {
    return this.http.get<ParticipanteTutoria[]>(`${API}/tutoring-sessions/${tutoriaId}/participants/`);
  }

  registrarParticipanteTutoria(tutoriaId: number, datos: DatosParticipanteTutoria): Observable<ParticipanteTutoria> {
    return this.http.post<ParticipanteTutoria>(`${API}/tutoring-sessions/${tutoriaId}/participants/`, datos);
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

  createThesisProgress(data: CreateThesisProgressData): Observable<ThesisProgress> {
    return this.http.post<ThesisProgress>(`${API}/thesis/`, data);
  }

  uploadEvidence(data: EvidenceUploadData): Observable<Evidence> {
    const form = new FormData();
    form.append('student', String(data.student));
    if (data.semester !== null) form.append('semester', String(data.semester));
    form.append('actividad_tipo', data.actividad_tipo);
    if (data.actividad_id !== undefined) form.append('actividad_id', String(data.actividad_id));
    form.append('titulo', data.titulo);
    if (data.descripcion) form.append('descripcion', data.descripcion);
    form.append('archivo_adjunto', data.archivo_adjunto);
    return this.http.post<Evidence>(`${API}/evidence/`, form);
  }

  linkEvidence(data: EvidenceLinkData): Observable<Evidence> {
    return this.http.post<Evidence>(`${API}/evidence/`, data);
  }
}
