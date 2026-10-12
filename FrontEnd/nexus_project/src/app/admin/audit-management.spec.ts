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
    http.expectOne('http://localhost:8000/api/v1/admin/audit/?page=1').flush({ count: [{
      id: 1,
      action: 'ROLE_ASSIGNED',
      actor: 1,
      actor_email: 'admin@example.com',
      target_user: 2,
      target_user_email: 'tutor@example.com',
      committee_assignment: null,
      details: { previous_role: 'STUDENT', new_role: 'TUTOR' },
      created_at: '2026-09-09T12:00:00Z',
    }].length, next: null, previous: null, results: [{
      id: 1,
      action: 'ROLE_ASSIGNED',
      actor: 1,
      actor_email: 'admin@example.com',
      target_user: 2,
      target_user_email: 'tutor@example.com',
      committee_assignment: null,
      details: { previous_role: 'STUDENT', new_role: 'TUTOR' },
      created_at: '2026-09-09T12:00:00Z',
    }] });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads and displays administrative history', () => {
    expect(fixture.nativeElement.textContent).toContain('Rol asignado');
    expect(fixture.nativeElement.textContent).toContain('admin@example.com');
    expect(fixture.nativeElement.textContent).toContain('tutor@example.com');
  });

  it('muestra los detalles como campos etiquetados y no como JSON recortado', () => {
    const rows = [...fixture.nativeElement.querySelectorAll('.details-list > div')].map((div: Element) => [
      div.querySelector('dt')?.textContent?.trim(),
      div.querySelector('dd')?.textContent?.trim(),
    ]);

    expect(rows).toEqual([
      ['Rol anterior', 'Estudiante'],
      ['Rol nuevo', 'Tutor'],
    ]);
    expect(fixture.nativeElement.textContent).not.toContain('previous_role');
  });

  it('traduce los roles conocidos en lugar de mostrar la constante', () => {
    const detalle = (fixture.nativeElement.querySelector('.details-cell') as HTMLElement).textContent ?? '';
    expect(detalle).toContain('Estudiante');
    expect(detalle).toContain('Tutor');
    expect(detalle).not.toContain('STUDENT');
    expect(detalle).not.toContain('new_role');
  });
});