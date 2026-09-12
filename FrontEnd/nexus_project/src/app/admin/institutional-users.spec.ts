import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstitutionalUsers } from './institutional-users';

describe('InstitutionalUsers', () => {
  let fixture: ComponentFixture<InstitutionalUsers>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstitutionalUsers],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(InstitutionalUsers);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('creates an institutional tutor account', () => {
    const component = fixture.componentInstance;
    (component as any).form = {
      first_name: 'Eva', last_name: 'Diaz', email: 'eva@example.com', password: 'Segura-12345', role: 'TUTOR',
    };
    component.createUser();
    const request = http.expectOne('http://localhost:8000/api/admin/users/');
    expect(request.request.method).toBe('POST');
    request.flush({ id: 2, email: 'eva@example.com', first_name: 'Eva', last_name: 'Diaz', role: 'TUTOR', roles: ['TUTOR'], permissions: ['tutoring.create'] });

    expect((component as any).message).toContain('eva@example.com');
    expect((component as any).saving).toBeFalse();
  });

  it('shows the backend validation message when creation fails', () => {
    const component = fixture.componentInstance;
    (component as any).form = {
      first_name: 'Eva', last_name: 'Diaz', email: 'eva@example.com', password: 'Segura-12345', role: 'TUTOR',
    };
    component.createUser();
    const request = http.expectOne('http://localhost:8000/api/admin/users/');
    request.flush({ email: ['Este correo ya esta registrado.'] }, { status: 400, statusText: 'Bad Request' });

    expect((component as any).error).toBe('Este correo ya esta registrado.');
    expect((component as any).saving).toBeFalse();
  });
});