import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';
import { Permission, UserRole } from './auth.models';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.validateSession().pipe(map(valid => valid || router.createUrlTree(['/login'])));
};

export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const requiredPermission = route.data['requiredPermission'] as Permission | undefined;
  return !requiredPermission || auth.hasPermission(requiredPermission)
    ? true
    : inject(Router).createUrlTree(['/home']);
};

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const allowedRoles = route.data['allowedRoles'] as UserRole[] | undefined;
  const user = auth.user();
  if (!user) return inject(Router).createUrlTree(['/login']);
  return !allowedRoles || allowedRoles.includes(user.role)
    ? true
    : inject(Router).createUrlTree(['/home']);
};
