import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthResponse, AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  const response: AuthResponse = {
    id: 1,
    email: 'usuario@example.com',
    first_name: 'Usuario',
    last_name: 'Prueba',
    rol: 'alumno',
    token: 'token-de-prueba',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stores the token and user after a successful login', () => {
    service.login(response.email, 'password').subscribe();
    const request = http.expectOne('http://localhost:8000/api/auth/login/');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: response.email, password: 'password' });
    request.flush(response);

    expect(service.getToken()).toBe(response.token);
    expect(service.user()).toEqual(response);
  });

  it('clears the session after logout', () => {
    service.login(response.email, 'password').subscribe();
    http.expectOne('http://localhost:8000/api/auth/login/').flush(response);

    service.logout().subscribe();
    const request = http.expectOne('http://localhost:8000/api/auth/logout/');
    expect(request.request.method).toBe('POST');
    request.flush({ logout: true });

    expect(service.getToken()).toBeNull();
    expect(service.user()).toBeNull();
  });
});