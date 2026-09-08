import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  const isLoginRequest = request.url.endsWith('/api/auth/login/');
  const authorizedRequest = token && !isLoginRequest
    ? request.clone({ setHeaders: { Authorization: `Token ${token}` } })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error) => {
      if (error.status === 401 && !isLoginRequest) {
        auth.expireSession();
      }
      return throwError(() => error);
    }),
  );
};
