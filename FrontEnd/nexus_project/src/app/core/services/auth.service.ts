import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { User, AuthResponse, UserRole, LoginCredentials, TokenRefreshResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly TOKEN_KEY = 'nexus_access_token';
  private readonly REFRESH_KEY = 'nexus_refresh_token';
  private readonly USER_KEY = 'nexus_user_data';

  // Signals
  readonly currentUser = signal<User | null>(this.getStoredUser());
  readonly token = signal<string | null>(this.getStoredToken());
  readonly isAuthenticated = computed(() => !!this.currentUser() && !!this.token());

  readonly userRole = computed(() => this.currentUser()?.role || null);
  readonly userFullName = computed(() => {
    const user = this.currentUser();
    if (!user) return 'Usuario';
    return user.fullName || user.full_name || `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim() || user.email;
  });

  readonly userInitials = computed(() => {
    const user = this.currentUser();
    if (!user) return 'NX';
    const first = user.firstName || user.first_name;
    const last = user.lastName || user.last_name;
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  });

  constructor() {}

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const payload = {
      email: credentials.email || credentials.username || '',
      password: credentials.password
    };

    return this.http.post<AuthResponse>('/api/v1/auth/login/', payload).pipe(
      tap(response => {
        this.saveAuthData(response);
      }),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  refreshToken(): Observable<TokenRefreshResponse> {
    const refresh = this.getStoredRefreshToken();
    if (!refresh) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<TokenRefreshResponse>('/api/v1/auth/refresh/', { refresh }).pipe(
      tap(res => {
        if (res.access) {
          localStorage.setItem(this.TOKEN_KEY, res.access);
          this.token.set(res.access);
        }
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>('/api/v1/auth/me/').pipe(
      tap(user => {
        this.currentUser.set(user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }),
      catchError(err => throwError(() => err))
    );
  }

  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return this.token() || this.getStoredToken();
  }

  getRefreshToken(): string | null {
    return this.getStoredRefreshToken();
  }

  hasRole(allowedRoles: UserRole[]): boolean {
    const current = this.currentUser();
    if (!current) return false;
    return allowedRoles.includes(current.role);
  }

  isCoordinator(): boolean {
    return this.currentUser()?.role === 'COORDINADOR' || this.currentUser()?.role === 'ADMIN';
  }

  isAdvisor(): boolean {
    const role = this.currentUser()?.role;
    return role === 'ASESOR' || role === 'COASESOR' || role === 'COMITE';
  }

  isStudent(): boolean {
    return this.currentUser()?.role === 'ESTUDIANTE';
  }

  getStudentId(): number | null {
    const u = this.currentUser();
    return u?.student_id || u?.studentId || null;
  }

  private saveAuthData(authData: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, authData.access);
    localStorage.setItem(this.REFRESH_KEY, authData.refresh);
    localStorage.setItem(this.USER_KEY, JSON.stringify(authData.user));
    this.token.set(authData.access);
    this.currentUser.set(authData.user);
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.token.set(null);
    this.currentUser.set(null);
  }

  private getStoredToken(): string | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token || token === 'mock-dev-token' || token.trim() === '') {
      return null;
    }
    return token;
  }

  private getStoredRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  private getStoredUser(): User | null {
    const data = localStorage.getItem(this.USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
}
