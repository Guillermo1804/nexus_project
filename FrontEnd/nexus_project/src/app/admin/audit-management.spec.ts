import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditManagement } from './audit-management';

describe('AuditManagement', () => {
  let fixture: ComponentFixture<AuditManagement>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditManagement],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AuditManagement);
    fixture.detectChanges();
    http.expectOne('http://localhost:8000/api/admin/audit/').flush([{
      id: 1,
      action: 'ROLE_ASSIGNED',
      actor: 1,
      actor_email: 'admin@example.com',
      target_user: 2,
      target_user_email: 'tutor@example.com',
      committee_assignment: null,
      details: { previous_role: 'STUDENT', new_role: 'TUTOR' },
      created_at: '2026-09-09T12:00:00Z',
    }]);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads and displays administrative history', () => {
    expect(fixture.nativeElement.textContent).toContain('ROLE_ASSIGNED');
    expect(fixture.nativeElement.textContent).toContain('admin@example.com');
    expect(fixture.nativeElement.textContent).toContain('tutor@example.com');
  });
});