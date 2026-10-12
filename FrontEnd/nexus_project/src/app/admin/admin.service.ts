import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthenticatedUser } from '../core/auth/auth.models';
import { PaginatedResponse } from '../shared/pagination';
import { AcademicCommittee, AdminAuditLog, AdminStudent, CommitteeMembership, CommitteeRole, InstitutionalUserCreate } from './admin.models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private readonly http: HttpClient) {}

  createInstitutionalUser(data: InstitutionalUserCreate): Observable<AuthenticatedUser> {
    return this.http.post<AuthenticatedUser>(`${API}/admin/users/`, data);
  }

  getUsers(): Observable<PaginatedResponse<AuthenticatedUser>> {
    return this.http.get<PaginatedResponse<AuthenticatedUser>>(`${API}/auth/users/`);
  }

  getStudents(): Observable<PaginatedResponse<AdminStudent>> {
    return this.http.get<PaginatedResponse<AdminStudent>>(`${API}/admin/students/`);
  }

  getCommittees(): Observable<PaginatedResponse<AcademicCommittee>> {
    return this.http.get<PaginatedResponse<AcademicCommittee>>(`${API}/committees/`);
  }

  createCommittee(student: number, user: number, role: CommitteeRole): Observable<AcademicCommittee> {
    return this.http.post<AcademicCommittee>(`${API}/committees/`, { student, memberships: [{ user, role }] });
  }

  deleteCommitteeMembership(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/committee-memberships/${id}/`);
  }

  getAuditLogs(page = 1): Observable<PaginatedResponse<AdminAuditLog>> {
    return this.http.get<PaginatedResponse<AdminAuditLog>>(`${API}/admin/audit/?page=${page}`);
  }
}