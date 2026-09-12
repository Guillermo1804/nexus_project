import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StudentRecord, TutoringSession, TutoringSessionData, Semester, CreateSemesterData } from './academic.models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AcademicService {
  constructor(private readonly http: HttpClient) {}

  getStudentRecord(studentId: number): Observable<StudentRecord> {
    return this.http.get<StudentRecord>(`${API}/records/${studentId}/`);
  }

  createTutoringSession(data: TutoringSessionData): Observable<TutoringSession> {
    return this.http.post<TutoringSession>(`${API}/tutoring/`, data);
  }

  getGlobalOverview(): Observable<StudentRecord[]> {
    return this.http.get<StudentRecord[]>(`${API}/academic/overview/`);
  }

  getStudentSemesters(studentId: number): Observable<Semester[]> {
    return this.http.get<Semester[]>(`${API}/students/${studentId}/semesters/`);
  }

  createSemester(studentId: number, data: CreateSemesterData): Observable<Semester> {
    return this.http.post<Semester>(`${API}/students/${studentId}/semesters/`, data);
  }
}