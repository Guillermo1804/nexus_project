import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const isLoginRequest = request.url.endsWith('/api/auth/login/');
  const token = auth.accessToken();
  const authorizedRequest = token && !isLoginRequest
    ? request.clone({ setHeaders: { Authorization: `Token ${token}` } })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isLoginRequest) {
        auth.handleSessionExpired();
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
