import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthenticatedUser } from '../core/auth/auth.models';
import { AdminAuditLog, AdminStudent, CommitteeAssignment, InstitutionalUserCreate } from './admin.models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private readonly http: HttpClient) {}

  createInstitutionalUser(data: InstitutionalUserCreate): Observable<AuthenticatedUser> {
    return this.http.post<AuthenticatedUser>(`${API}/admin/users/`, data);
  }

  getUsers(): Observable<AuthenticatedUser[]> {
    return this.http.get<AuthenticatedUser[]>(`${API}/auth/users/`);
  }

  getStudents(): Observable<AdminStudent[]> {
    return this.http.get<AdminStudent[]>(`${API}/admin/students/`);
  }

  getCommitteeAssignments(): Observable<CommitteeAssignment[]> {
    return this.http.get<CommitteeAssignment[]>(`${API}/admin/committee/`);
  }

  createCommitteeAssignment(data: Pick<CommitteeAssignment, 'user' | 'student' | 'rol_comite'>): Observable<CommitteeAssignment> {
    return this.http.post<CommitteeAssignment>(`${API}/admin/committee/`, data);
  }

  setCommitteeAssignmentStatus(id: number, is_active: boolean): Observable<CommitteeAssignment> {
    return this.http.patch<CommitteeAssignment>(`${API}/admin/committee/${id}/`, { is_active });
  }

  getAuditLogs(): Observable<AdminAuditLog[]> {
    return this.http.get<AdminAuditLog[]>(`${API}/admin/audit/`);
  }
}