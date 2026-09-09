import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Permission } from './auth.models';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() || inject(Router).createUrlTree(['/login']);
};

export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const requiredPermission = route.data['requiredPermission'] as Permission | undefined;
  return auth.isAuthenticated() && (!requiredPermission || auth.hasPermission(requiredPermission))
    ? true
    : inject(Router).createUrlTree(['/home']);
};
