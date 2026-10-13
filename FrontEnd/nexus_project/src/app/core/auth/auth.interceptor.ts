import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { TokenService } from './token.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const tokens = inject(TokenService);
  const router = inject(Router);
  const isAuthRequest = /\/api\/v1\/auth\/(login|token\/refresh)\/$/.test(request.url);
  const token = tokens.access();
  const authorizedRequest = token && !isAuthRequest
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthRequest) return throwError(() => error);
      return reintentarConRefresh(tokens, router, next, request, true);
    }),
  );
};

/**
 * Renueva el acceso y repite la petición. Como la rotación invalida el refresh
 * anterior, el reintento puede volver a recibir un 401 si el token se invalidó entre
 * medias; en ese caso se fuerza un segundo refresco antes de rendirse.
 *
 * Cerrar la sesión sólo procede si el backend rechazó el refresh (401/403). Un corte
 * de red o un error del servidor no invalidan el token, y expulsar al usuario por eso
 * era la causa de que la sesión «se acabara sola».
 */
function reintentarConRefresh(
  tokens: TokenService,
  router: Router,
  next: HttpHandlerFn,
  request: HttpRequest<unknown>,
  permitirSegundoIntento: boolean,
): Observable<HttpEvent<unknown>> {
  return tokens.refreshAccessToken().pipe(
    switchMap(({ access }) =>
      next(request.clone({ setHeaders: { Authorization: `Bearer ${access}` } })).pipe(
        catchError((retryError: unknown) => {
          const rechazado = retryError instanceof HttpErrorResponse && retryError.status === 401;
          if (!rechazado || !permitirSegundoIntento) return throwError(() => retryError);
          return reintentarConRefresh(tokens, router, next, request, false);
        }),
      ),
    ),
    catchError((refreshError: unknown) => {
      const rechazoReal = refreshError instanceof HttpErrorResponse && [401, 403].includes(refreshError.status);
      if (!rechazoReal) return throwError(() => refreshError);
      tokens.handleSessionExpired();
      void router.navigate(['/login']);
      return throwError(() => refreshError);
    }),
  );
}