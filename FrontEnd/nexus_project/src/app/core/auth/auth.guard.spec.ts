import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { authGuard, permissionGuard, roleGuard } from './auth.guard';
import { AuthService } from './auth.service';

const route = (data: Record<string, unknown>) => ({ data } as unknown as ActivatedRouteSnapshot);
const state = {} as RouterStateSnapshot;

describe('auth guards', () => {
  const auth = {
    validateSession: jasmine.createSpy().and.returnValue(of(true)),
    hasPermission: jasmine.createSpy().and.returnValue(true),
    user: jasmine.createSpy().and.returnValue({ role: 'PROGRAM_COORDINATOR' }),
  };
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] }));

  it('authGuard revalidates the backend session', done => TestBed.runInInjectionContext(() => {
    (authGuard(route({}), state) as ReturnType<typeof of>).subscribe(result => {
      expect(result).toBeTrue(); expect(auth.validateSession).toHaveBeenCalled(); done();
    });
  }));

  it('roleGuard allows coordinator academic access and blocks admin routes', () => TestBed.runInInjectionContext(() => {
    expect(roleGuard(route({ allowedRoles: ['PROGRAM_COORDINATOR'] }), state)).toBeTrue();
    expect(roleGuard(route({ allowedRoles: ['SYSTEM_ADMIN'] }), state)).toEqual(jasmine.anything());
  }));

  it('permissionGuard uses the refreshed permissions', () => TestBed.runInInjectionContext(() => {
    expect(permissionGuard(route({ requiredPermission: 'academic.read.global' }), state)).toBeTrue();
    auth.hasPermission.and.returnValue(false);
    expect(permissionGuard(route({ requiredPermission: 'users.role.assign' }), state)).toEqual(jasmine.anything());
  }));
});
