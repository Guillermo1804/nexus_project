import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AuthenticatedUser, UserRole } from './auth.models';
import { environment } from '../../../environments/environment';

const STORAGE_VERSION = '2';
const ACCESS_KEY = 'nexus_access';
const REFRESH_KEY = 'nexus_refresh';
const USER_KEY = 'nexus_user';
const VERSION_KEY = 'nexus_storage_version';
const AUTH_API = `${environment.apiUrl}/auth`;

export interface StoredSession {
  access: string | null;
  refresh: string | null;
  user: AuthenticatedUser | null;
}

const VALID_ROLES: readonly UserRole[] = ['STUDENT', 'TUTOR', 'COMMITTEE_MEMBER', 'PROGRAM_COORDINATOR', 'SYSTEM_ADMIN'];

@Injectable({ providedIn: 'root' })
export class TokenService {
  readonly access = signal<string | null>(null);
  readonly refresh = signal<string | null>(null);
  readonly user = signal<AuthenticatedUser | null>(null);
  readonly sessionExpired = signal(false);

  constructor(private readonly http: HttpClient) {
    this.loadStoredSession();
  }

  setSession(access: string, refresh: string, user: AuthenticatedUser): void {
    if (!this.isValidUser(user)) {
      this.clearSession();
      throw new Error('Invalid user role');
    }
    this.access.set(access);
    this.refresh.set(refresh);
    this.user.set(user);
    this.persist(access, refresh, user);
  }

  clearSession(): void {
    this.access.set(null);
    this.refresh.set(null);
    this.user.set(null);
    try {
      if (typeof window !== 'undefined') {
        [ACCESS_KEY, REFRESH_KEY, USER_KEY, VERSION_KEY].forEach(key => localStorage.removeItem(key));
      }
    } catch {}
  }

  handleSessionExpired(): void {
    const hadSession = this.access() !== null || this.refresh() !== null;
    this.clearSession();
    if (hadSession) this.sessionExpired.set(true);
  }

  dismissSessionExpired(): void {
    this.sessionExpired.set(false);
  }

  refreshAccessToken(): Observable<{ access: string; refresh?: string }> {
    const refresh = this.refresh();
    if (!refresh) return throwError(() => new Error('No refresh token'));
    return this.http.post<{ access: string; refresh?: string }>(`${AUTH_API}/token/refresh/`, { refresh }).pipe(
      tap(tokens => {
        this.access.set(tokens.access);
        this.persist(tokens.access, tokens.refresh ?? this.refresh()!, this.user()!);
        if (tokens.refresh) this.refresh.set(tokens.refresh);
      }),
      catchError(err => {
        const status = err.status ?? 0;
        if (status === 401 || status === 403) this.handleSessionExpired();
        return throwError(() => err);
      }),
    );
  }

  private loadStoredSession(): void {
    try {
      if (typeof window === 'undefined') return;
      if (localStorage.getItem(VERSION_KEY) !== STORAGE_VERSION) {
        this.clearStoredSession();
        return;
      }
      const access = localStorage.getItem(ACCESS_KEY);
      const refresh = localStorage.getItem(REFRESH_KEY);
      const raw = localStorage.getItem(USER_KEY);
      if (!access || !refresh || !raw) return;
      const user = JSON.parse(raw) as AuthenticatedUser;
      if (!this.isValidUser(user)) {
        this.clearStoredSession();
        return;
      }
      this.access.set(access);
      this.refresh.set(refresh);
      this.user.set(user);
    } catch {
      this.clearStoredSession();
    }
  }

  persist(access: string, refresh: string, user: AuthenticatedUser): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACCESS_KEY, access);
        localStorage.setItem(REFRESH_KEY, refresh);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
      }
    } catch {}
  }

  private clearStoredSession(): void {
    try {
      if (typeof window !== 'undefined') {
        [ACCESS_KEY, REFRESH_KEY, USER_KEY, VERSION_KEY].forEach(key => localStorage.removeItem(key));
      }
    } catch {}
  }

  private isValidUser(value: unknown): value is AuthenticatedUser {
    if (!value || typeof value !== 'object') return false;
    const user = value as Partial<AuthenticatedUser>;
    const role = user.role;
    const isValidRole = role !== undefined && VALID_ROLES.includes(role as UserRole);
    return typeof user.id === 'number'
      && typeof user.email === 'string'
      && isValidRole
      && Array.isArray(user.roles)
      && user.roles.every((r: string) => VALID_ROLES.includes(r as UserRole))
      && Array.isArray(user.permissions);
  }
}