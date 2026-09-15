import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { AuthenticatedUser, AuthResponse, LoginCredentials, Permission, RoleAssignment, UserRole } from './auth.models';
import { PaginatedResponse } from '../../shared/pagination';
import { environment } from '../../../environments/environment';

const AUTH_API = `${environment.apiUrl}/auth`;
const STORAGE_VERSION = '2';
const VALID_ROLES: UserRole[] = ['STUDENT', 'TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR', 'SYSTEM_ADMIN'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storedSession = this.loadStoredSession();
  private readonly access = signal<string | null>(this.storedSession.access);
  private readonly refresh = signal<string | null>(this.storedSession.refresh);
  readonly user = signal<AuthenticatedUser | null>(this.storedSession.user);
  readonly sessionExpired = signal(false);
  private refreshRequest?: Observable<{ access: string; refresh?: string }>;
  private validationRequest?: Observable<boolean>;

  constructor(private readonly http: HttpClient) {}

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${AUTH_API}/login/`, credentials).pipe(tap(response => {
      this.setSession(response);
      this.sessionExpired.set(false);
    }));
  }

  logout(): Observable<unknown> {
    const refresh = this.refresh();
    if (!refresh) { this.clearSession(); return of(null); }
    return this.http.post(`${AUTH_API}/logout/`, { refresh }).pipe(
      catchError(error => { this.clearSession(); return throwError(() => error); }),
      tap(() => this.clearSession()),
    );
  }

  validateSession(): Observable<boolean> {
    if (!this.access()) return of(false);
    if (this.validationRequest) return this.validationRequest;
    this.validationRequest = this.http.get<AuthenticatedUser>(`${AUTH_API}/me/`).pipe(
      tap(user => this.setUser(user)),
      map(() => true),
      catchError(() => { this.handleSessionExpired(); return of(false); }),
      finalize(() => this.validationRequest = undefined),
      shareReplay(1),
    );
    return this.validationRequest;
  }

  refreshAccessToken(): Observable<{ access: string; refresh?: string }> {
    if (this.refreshRequest) return this.refreshRequest;
    const refresh = this.refresh();
    if (!refresh) return throwError(() => new Error('No refresh token'));
    this.refreshRequest = this.http.post<{ access: string; refresh?: string }>(`${AUTH_API}/token/refresh/`, { refresh }).pipe(
      tap(tokens => {
        this.access.set(tokens.access); this.store('nexus_access', tokens.access);
        if (tokens.refresh) { this.refresh.set(tokens.refresh); this.store('nexus_refresh', tokens.refresh); }
      }),
      shareReplay(1),
      finalize(() => this.refreshRequest = undefined),
    );
    return this.refreshRequest;
  }

  loadUsers(): Observable<PaginatedResponse<AuthenticatedUser>> { return this.http.get<PaginatedResponse<AuthenticatedUser>>(`${AUTH_API}/users/`); }
  assignRole(userId: number, role: UserRole): Observable<AuthenticatedUser> { return this.http.patch<AuthenticatedUser>(`${AUTH_API}/users/${userId}/role/`, { role } satisfies RoleAssignment); }
  hasPermission(permission: Permission): boolean { return this.user()?.permissions.includes(permission) ?? false; }
  accessToken(): string | null { return this.access(); }
  isAuthenticated(): boolean { return this.access() !== null; }

  handleSessionExpired(): void {
    const hadSession = this.isAuthenticated() || this.refresh() !== null;
    this.clearSession();
    if (hadSession) this.sessionExpired.set(true);
  }
  dismissSessionExpired(): void { this.sessionExpired.set(false); }
  clearSession(): void {
    this.access.set(null); this.refresh.set(null); this.user.set(null);
    try { if (typeof window !== 'undefined') ['nexus_access', 'nexus_refresh', 'nexus_user', 'nexus_token', 'nexus_storage_version'].forEach(key => localStorage.removeItem(key)); } catch {}
  }

  private setSession(response: AuthResponse): void {
    if (!this.isValidUser(response.user)) { this.clearSession(); throw new Error('Invalid user role'); }
    this.access.set(response.access); this.refresh.set(response.refresh); this.setUser(response.user);
    this.store('nexus_access', response.access); this.store('nexus_refresh', response.refresh);
    this.store('nexus_storage_version', STORAGE_VERSION);
  }
  private setUser(user: AuthenticatedUser): void {
    if (!this.isValidUser(user)) { this.clearSession(); throw new Error('Invalid user role'); }
    this.user.set(user); this.store('nexus_user', JSON.stringify(user));
  }
  private loadStoredSession(): { access: string | null; refresh: string | null; user: AuthenticatedUser | null } {
    const empty = { access: null, refresh: null, user: null };
    try {
      if (this.saved('nexus_storage_version') !== STORAGE_VERSION) { this.clearStoredSession(); return empty; }
      const access = this.saved('nexus_access'); const refresh = this.saved('nexus_refresh'); const raw = this.saved('nexus_user');
      if (!access || !refresh || !raw) { this.clearStoredSession(); return empty; }
      const user = JSON.parse(raw);
      if (!this.isValidUser(user)) { this.clearStoredSession(); return empty; }
      return { access, refresh, user };
    } catch { this.clearStoredSession(); return empty; }
  }
  private isValidUser(value: unknown): value is AuthenticatedUser {
    if (!value || typeof value !== 'object') return false;
    const user = value as Partial<AuthenticatedUser>;
    return typeof user.id === 'number' && typeof user.email === 'string' && VALID_ROLES.includes(user.role as UserRole)
      && Array.isArray(user.roles) && user.roles.every(role => VALID_ROLES.includes(role)) && Array.isArray(user.permissions);
  }
  private clearStoredSession(): void {
    try { if (typeof window !== 'undefined') ['nexus_access', 'nexus_refresh', 'nexus_user', 'nexus_token', 'nexus_storage_version'].forEach(key => localStorage.removeItem(key)); } catch {}
  }
  private saved(key: string): string | null { try { return typeof window !== 'undefined' ? localStorage.getItem(key) : null; } catch { return null; } }
  private store(key: string, value: string): void { try { if (typeof window !== 'undefined') localStorage.setItem(key, value); } catch {} }
}
