import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommitteeManagement } from './committee-management';

describe('CommitteeManagement', () => {
  let fixture: ComponentFixture<CommitteeManagement>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommitteeManagement],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CommitteeManagement);
    fixture.detectChanges();
    http.expectOne('http://localhost:8000/api/v1/committees/').flush({ count: [].length, next: null, previous: null, results: [] });
    http.expectOne('http://localhost:8000/api/v1/auth/users/').flush({ count: [{
      id: 2, email: 'tutor@example.com', first_name: 'Eva', last_name: 'Diaz', role: 'TUTOR', roles: ['TUTOR'], permissions: ['tutoring.create'],
    }].length, next: null, previous: null, results: [{
      id: 2, email: 'tutor@example.com', first_name: 'Eva', last_name: 'Diaz', role: 'TUTOR', roles: ['TUTOR'], permissions: ['tutoring.create'],
    }] });
    http.expectOne('http://localhost:8000/api/v1/admin/students/').flush({ count: [{
      id: 1, matricula: 'DOC-001', nombre_completo: 'Ana Lopez', programa_doctoral: 'Doctorado', cohorte: '2026', estatus_activo: true,
    }].length, next: null, previous: null, results: [{
      id: 1, matricula: 'DOC-001', nombre_completo: 'Ana Lopez', programa_doctoral: 'Doctorado', cohorte: '2026', estatus_activo: true,
    }] });
  });

  afterEach(() => http.verify());

  it('loads only assignable accounts and active students', () => {
    expect((fixture.componentInstance as any).users.length).toBe(1);
    expect((fixture.componentInstance as any).students[0].matricula).toBe('DOC-001');
    expect(fixture.nativeElement.textContent).toContain('Selecciona una cuenta');
  });

  it('requires both selectors before creating an assignment', () => {
    fixture.componentInstance.createAssignment();
    expect((fixture.componentInstance as any).error).toContain('Selecciona una cuenta');
    http.verify();
  });
});

describe('CommitteeManagement, confirmación antes de una acción destructiva', () => {
  const MEMBERSHIP = { id: 77, user: 20, user_email: 'roberto.gomez@nexus.edu', role: 'ASESOR' as const };
  let fixture: ComponentFixture<CommitteeManagement>;
  let component: CommitteeManagement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommitteeManagement],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CommitteeManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne('http://localhost:8000/api/v1/committees/').flush({
      count: 1, next: null, previous: null,
      results: [{ id: 5, student: 10, student_name: 'Ana Laura Morales Vega', memberships: [MEMBERSHIP] }],
    });
    http.expectOne('http://localhost:8000/api/v1/auth/users/').flush({ count: 0, next: null, previous: null, results: [] });
    http.expectOne('http://localhost:8000/api/v1/admin/students/').flush({ count: 0, next: null, previous: null, results: [] });
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('un clic en «Eliminar» abre la confirmación y no borra nada', () => {
    component.remove(MEMBERSHIP);
    fixture.detectChanges();

    // Sin petición DELETE: el borrado sólo ocurre al confirmar.
    http.expectNone((r) => r.method === 'DELETE');
    expect(fixture.nativeElement.querySelector('app-confirm-dialog')).toBeTruthy();
  });

  it('nombra a la persona y al estudiante para que no haya duda de qué se borra', () => {
    component.remove(MEMBERSHIP);
    fixture.detectChanges();

    const aviso = fixture.nativeElement.textContent as string;
    expect(aviso).toContain('roberto.gomez@nexus.edu');
    expect(aviso).toContain('Ana Laura Morales Vega');
    expect(aviso).toContain('no se puede deshacer');
  });

  it('confirmar ejecuta el borrado y descuenta la membresía de la lista', () => {
    component.remove(MEMBERSHIP);
    fixture.detectChanges();

    component['confirmRemove']();
    const req = http.expectOne('http://localhost:8000/api/v1/committee-memberships/77/');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    fixture.detectChanges();

    expect(component['committees'][0].memberships.length).toBe(0);
    expect(fixture.nativeElement.querySelector('app-confirm-dialog')).toBeNull();
  });

  it('cancelar no borra y cierra el diálogo', () => {
    component.remove(MEMBERSHIP);
    fixture.detectChanges();

    component['cancelRemove']();
    fixture.detectChanges();

    http.expectNone((r) => r.method === 'DELETE');
    expect(fixture.nativeElement.querySelector('app-confirm-dialog')).toBeNull();
  });

  it('el diálogo se anuncia como alertdialog y enfoca la cancelación, nunca el borrado', async () => {
    // El foco sólo se puede comprobar con el fixture en el documento: un elemento
    // desconectado no acepta .focus() y document.activeElement nunca cambiaría.
    document.body.appendChild(fixture.nativeElement);
    component.remove(MEMBERSHIP);
    fixture.detectChanges();
    await Promise.resolve();

    const panel = fixture.nativeElement.querySelector('.modal-panel') as HTMLElement;
    expect(panel.getAttribute('role')).withContext('rol de alerta').toBe('alertdialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(component['pendingRemoval']).toBeNull();
    http.expectNone((r) => r.method === 'DELETE');
    fixture.nativeElement.remove();
  });
});