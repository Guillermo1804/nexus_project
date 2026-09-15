import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isAuthRequest = /\/api\/v1\/auth\/(login|token\/refresh)\/$/.test(request.url);
  const token = auth.accessToken();
  const authorizedRequest = token && !isAuthRequest
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthRequest) return throwError(() => error);
      return auth.refreshAccessToken().pipe(
        switchMap(({ access }) => next(request.clone({ setHeaders: { Authorization: `Bearer ${access}` } }))),
        catchError(refreshError => {
          auth.handleSessionExpired();
          void router.navigate(['/login']);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
