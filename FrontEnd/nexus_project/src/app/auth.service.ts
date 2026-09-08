import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  rol: string;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:8000/api/auth';
  private readonly token = signal<string | null>(null);
  readonly user = signal<AuthResponse | null>(null);
  readonly sessionExpired = signal(false);

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login/`, { email, password }).pipe(
      tap((response) => {
        this.token.set(response.token);
        this.user.set(response);
        this.sessionExpired.set(false);
      }),
    );
  }

  logout(): Observable<{ logout: boolean }> {
    return this.http.post<{ logout: boolean }>(`${this.apiUrl}/logout/`, {}).pipe(
      tap(() => this.clearSession()),
    );
  }

  clearSession(): void {
    this.token.set(null);
    this.user.set(null);
  }

  getToken(): string | null {
    return this.token();
  }

  expireSession(): void {
    this.clearSession();
    this.sessionExpired.set(true);
  }

  dismissExpiredSession(): void {
    this.sessionExpired.set(false);
  }
}
