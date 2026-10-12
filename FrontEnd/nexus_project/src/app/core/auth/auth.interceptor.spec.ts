import { HttpClient, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const API = 'http://localhost:8000/api/v1';
const ACUERDOS = `${API}/agreements/`;
const REFRESH = `${API}/auth/token/refresh/`;

/** Monta el interceptor y devuelve el par http/controlador ya resueltos. */
function setup(): { http: HttpClient; controller: HttpTestingController; auth: AuthService } {
  TestBed.configureTestingModule({
    providers: [AuthService, provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
  });
  return {
    http: TestBed.inject(HttpClient),
    controller: TestBed.inject(HttpTestingController),
    auth: TestBed.inject(AuthService),
  };
}

/** Deja una sesión ya iniciada sin pasar por el formulario de acceso. */
function sesion(auth: AuthService, access: string, refresh: string): void {
  auth['access'].set(access);
  auth['refresh'].set(refresh);
}

describe('authInterceptor', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('añade el token de acceso a las peticiones', () => {
    const { http, controller, auth } = setup();
    sesion(auth, 'vigente', 'refresh-vigente');

    http.get(ACUERDOS).subscribe();
    const req = controller.expectOne(ACUERDOS);

    expect(req.request.headers.get('Authorization')).toBe('Bearer vigente');
  });

  it('renueva el token y repite la petición cuando el acceso caduca', () => {
    const { http, controller, auth } = setup();
    sesion(auth, 'caducado', 'refresh-vigente');

    http.get(ACUERDOS).subscribe({ error: () => undefined });
    controller.expectOne(ACUERDOS).flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = controller.expectOne(REFRESH);
    expect(refresh.request.body).toEqual({ refresh: 'refresh-vigente' });
    refresh.flush({ access: 'nuevo-acceso', refresh: 'nuevo-refresh' });

    const reintento = controller.expectOne(ACUERDOS);
    expect(reintento.request.headers.get('Authorization')).toBe('Bearer nuevo-acceso');
    reintento.flush({ results: [] }, { status: 200, statusText: 'OK' });
  });

  it('guarda el refresh rotado para no perder la sesión en el siguiente refresco', () => {
    const { http, controller, auth } = setup();
    sesion(auth, 'caducado', 'refresh-vigente');

    http.get(ACUERDOS).subscribe({ error: () => undefined });
    controller.expectOne(ACUERDOS).flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne(REFRESH).flush({ access: 'nuevo-acceso', refresh: 'refresh-rotado' });
    controller.expectOne(ACUERDOS).flush({ results: [] }, { status: 200, statusText: 'OK' });

    expect(auth.accessToken()).toBe('nuevo-acceso');
  });

  it('no cierra la sesión si el refresco falla por un problema de red', () => {
    const { http, controller, auth } = setup();
    sesion(auth, 'caducado', 'refresh-vigente');

    http.get(ACUERDOS).subscribe({ error: () => undefined });
    controller.expectOne(ACUERDOS).flush({}, { status: 401, statusText: 'Unauthorized' });
    // Un 503 del servidor no invalida el token del usuario.
    controller.expectOne(REFRESH).flush({}, { status: 503, statusText: 'Service Unavailable' });

    expect(auth.isAuthenticated()).withContext('la sesión sobrevive a un fallo del servidor').toBeTrue();
    expect(auth.sessionExpired()).toBeFalse();
  });

  it('cierra la sesión cuando el backend rechaza el token de refresco', () => {
    const { http, controller, auth } = setup();
    sesion(auth, 'caducado', 'refresh-rechazado');

    http.get(ACUERDOS).subscribe({ error: () => undefined });
    controller.expectOne(ACUERDOS).flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne(REFRESH).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBeFalse();
    expect(auth.sessionExpired()).toBeTrue();
  });

  it('deja pasar intactos los errores que no son de sesión', () => {
    const { http, controller, auth } = setup();
    sesion(auth, 'vigente', 'refresh-vigente');
    let recibido = 0;

    http.get(ACUERDOS).subscribe({ error: (err) => (recibido = err.status) });
    controller.expectOne(ACUERDOS).flush({}, { status: 403, statusText: 'Forbidden' });

    expect(recibido).toBe(403);
    expect(auth.isAuthenticated()).toBeTrue();
  });
});