import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';
import { AuthenticatedUser, AuthResponse, LoginCredentials, Permission, RoleAssignment, UserRole } from './auth.models';
import { PaginatedResponse } from '../../shared/pagination';
import { environment } from '../../../environments/environment';
import { TokenService } from './token.service';

const AUTH_API = `${environment.apiUrl}/auth`;
const VALID_ROLES: UserRole[] = ['STUDENT', 'TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR', 'SYSTEM_ADMIN'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  get access() { return this.tokens.access(); }
  get refresh() { return this.tokens.refresh(); }
  get user() { return this.tokens.user(); }
  get sessionExpired() { return this.tokens.sessionExpired(); }

  constructor(
    private readonly http: HttpClient,
    private readonly tokens: TokenService
  ) {}

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${AUTH_API}/login/`, credentials).pipe(tap(response => {
      this.tokens.setSession(response.access, response.refresh, response.user);
      this.tokens.sessionExpired.set(false);
    }));
  }

  logout(): Observable<unknown> {
    const refresh = this.tokens.refresh();
    if (!refresh) { this.tokens.clearSession(); return of(null); }
    return this.http.post(`${AUTH_API}/logout/`, { refresh }).pipe(
      catchError(error => { this.tokens.clearSession(); return throwError(() => error); }),
      tap(() => this.tokens.clearSession()),
    );
  }

  validateSession(): Observable<boolean> {
    if (!this.tokens.access()) return of(false);
    return this.http.get<AuthenticatedUser>(`${AUTH_API}/me/`).pipe(
      tap((user: AuthenticatedUser) => this.tokens.user.set(user)),
      map(() => true),
      catchError((error: unknown) => {
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        if (status === 401 || status === 403) this.tokens.handleSessionExpired();
        return of(false);
      }),
      shareReplay(1),
    );
  }

  refreshAccessToken(): Observable<{ access: string; refresh?: string }> {
    return this.tokens.refreshAccessToken();
  }

  loadUsers(): Observable<PaginatedResponse<AuthenticatedUser>> { return this.http.get<PaginatedResponse<AuthenticatedUser>>(`${AUTH_API}/users/`); }
  assignRole(userId: number, role: UserRole): Observable<AuthenticatedUser> { return this.http.patch<AuthenticatedUser>(`${AUTH_API}/users/${userId}/role/`, { role } satisfies RoleAssignment); }
  hasPermission(permission: Permission): boolean { return this.tokens.user()?.permissions.includes(permission) ?? false; }
  accessToken(): string | null { return this.tokens.access(); }
  isAuthenticated(): boolean { return this.tokens.access() !== null; }

  dismissSessionExpired(): void { this.tokens.dismissSessionExpired(); }
  clearSession(): void { this.tokens.clearSession(); }
}