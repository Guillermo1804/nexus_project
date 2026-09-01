import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AcademicCommitteeMember,
  CommitteeAssignRequest,
  CommitteeAssignResponse
} from '../models/committee.model';
import { DeleteResponse } from '../models/student.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class CommitteeService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/students';

  /**
   * Obtiene la lista de miembros activos del comité tutorial de un estudiante.
   */
  getCommittee(studentId: number): Observable<AcademicCommitteeMember[]> {
    return this.http.get<AcademicCommitteeMember[]>(`${this.apiUrl}/${studentId}/committee/`);
  }

  /**
   * Obtiene la lista de docentes y asesores disponibles desde /api/v1/users/?role=ASESOR
   */
  getAvailableAdvisors(): Observable<User[]> {
    return this.http.get<User[]>('/api/v1/users/?role=ASESOR');
  }

  /**
   * Asigna un nuevo miembro al comité académico del estudiante (Solo Coordinador).
   */
  assignMember(studentId: number, payload: CommitteeAssignRequest): Observable<CommitteeAssignResponse> {
    return this.http.post<CommitteeAssignResponse>(`${this.apiUrl}/${studentId}/committee/`, payload);
  }

  /**
   * Actualiza el rol o estado de un miembro del comité.
   */
  updateMember(
    studentId: number,
    memberId: number,
    payload: Partial<CommitteeAssignRequest>
  ): Observable<AcademicCommitteeMember> {
    return this.http.patch<AcademicCommitteeMember>(
      `${this.apiUrl}/${studentId}/committee/${memberId}/`,
      payload
    );
  }

  /**
   * Remueve a un miembro del comité tutorial del estudiante (Solo Coordinador).
   */
  removeMember(studentId: number, memberId: number): Observable<DeleteResponse> {
    return this.http.delete<DeleteResponse>(`${this.apiUrl}/${studentId}/committee/${memberId}/`);
  }
}
