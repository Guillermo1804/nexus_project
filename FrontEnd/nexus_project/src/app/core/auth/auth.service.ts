import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthenticatedUser, LoginCredentials, LoginResponse, RegistrationData } from './auth.models';

const AUTH_API = 'http://localhost:8000/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly token = signal<string | null>(null);
  readonly user = signal<AuthenticatedUser | null>(null);
  readonly sessionExpired = signal(false);

  constructor(private readonly http: HttpClient) {}

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${AUTH_API}/login/`, credentials).pipe(
      tap((response) => {
        this.token.set(response.token);
        this.user.set(response);
        this.sessionExpired.set(false);
      }),
    );
  }

  register(data: RegistrationData): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${AUTH_API}/register/`, data).pipe(
      tap((response) => {
        this.token.set(response.token);
        this.user.set(response);
        this.sessionExpired.set(false);
      }),
    );
  }

  logout(): Observable<unknown> {
    return this.http.post(`${AUTH_API}/logout/`, {}).pipe(tap(() => this.clearSession()));
  }

  accessToken(): string | null {
    return this.token();
  }

  isAuthenticated(): boolean {
    return this.token() !== null;
  }

  handleSessionExpired(): void {
    const hadSession = this.isAuthenticated();
    this.clearSession();
    if (hadSession) {
      this.sessionExpired.set(true);
    }
  }

  dismissSessionExpired(): void {
    this.sessionExpired.set(false);
  }

  clearSession(): void {
    this.token.set(null);
    this.user.set(null);
  }
}
