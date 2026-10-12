import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './auth.models';

const user: AuthenticatedUser = {
  id: 1, email: 'coord@nexus.edu', first_name: 'Cora', last_name: 'Dora',
  role: 'PROGRAM_COORDINATOR', roles: ['PROGRAM_COORDINATOR'], permissions: ['academic.read.global'],
};

describe('AuthService session validation', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.clear(); });

  it('revalidates a stored session with auth/me and updates the user', () => {
    localStorage.setItem('nexus_storage_version', '2');
    localStorage.setItem('nexus_access', 'access');
    localStorage.setItem('nexus_refresh', 'refresh');
    localStorage.setItem('nexus_user', JSON.stringify(user));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService); http = TestBed.inject(HttpTestingController);

    let valid = false;
    service.validateSession().subscribe(value => valid = value);
    http.expectOne(request => request.url.endsWith('/auth/me/')).flush({ ...user, first_name: 'Updated' });

    expect(valid).toBeTrue();
    expect(service.user()?.first_name).toBe('Updated');
  });

  it('discards storage containing a removed role', () => {
    localStorage.setItem('nexus_storage_version', '2');
    localStorage.setItem('nexus_access', 'access');
    localStorage.setItem('nexus_refresh', 'refresh');
    localStorage.setItem('nexus_user', JSON.stringify({ ...user, role: 'ACADEMIC_ADMIN', roles: ['ACADEMIC_ADMIN'] }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);

    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('nexus_user')).toBeNull();
  });

  it('invalidates storage from an older schema version', () => {
    localStorage.setItem('nexus_storage_version', '1');
    localStorage.setItem('nexus_access', 'access');
    localStorage.setItem('nexus_refresh', 'refresh');
    localStorage.setItem('nexus_user', JSON.stringify(user));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);

    expect(service.isAuthenticated()).toBeFalse();
  });
});
