import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutoringModalComponent } from './tutoring-modal.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TutoringService } from '../../../core/services/tutoring.service';

describe('TutoringModalComponent', () => {
  let component: TutoringModalComponent;
  let fixture: ComponentFixture<TutoringModalComponent>;
  let tutoringService: TutoringService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutoringModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TutoringService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TutoringModalComponent);
    component = fixture.componentInstance;
    tutoringService = TestBed.inject(TutoringService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create TutoringModalComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should emit close and closed events when onCloseModal() is called', () => {
    let closeCalled = false;
    let closedCalled = false;

    component.close.subscribe(() => {
      closeCalled = true;
    });
    component.closed.subscribe(() => {
      closedCalled = true;
    });

    component.onCloseModal();
    expect(closeCalled).toBeTrue();
    expect(closedCalled).toBeTrue();
  });

  it('should validate required form fields', () => {
    component.form.patchValue({
      fecha_sesion: '',
      resumen: ''
    });
    expect(component.form.invalid).toBeTrue();

    component.form.patchValue({
      fecha_sesion: '2024-03-15',
      semester: 2,
      modalidad: 'PRESENCIAL',
      resumen: 'Revisión metodológica y marco teórico del proyecto.'
    });
    expect(component.form.valid).toBeTrue();
  });

  it('should allow adding and removing observation topics', () => {
    const initialLength = component.observationsList().length;
    component.addObservationTopic();
    expect(component.observationsList().length).toBe(initialLength + 1);

    component.updateObservationTopic(initialLength, 'titulo_tema', 'Nuevo Tema');
    component.updateObservationTopic(initialLength, 'contenido', 'Comentarios del nuevo tema');
    expect(component.observationsList()[initialLength].titulo_tema).toBe('Nuevo Tema');

    component.removeObservationTopic(initialLength);
    expect(component.observationsList().length).toBe(initialLength);
  });

  it('should allow toggling participant attendance', () => {
    expect(component.participantsList()[0].asistencia).toBeTrue();
    component.toggleParticipantAttendance(0);
    expect(component.participantsList()[0].asistencia).toBeFalse();
  });

  it('should emit saved event upon form submission', () => {
    let savedSession: any = null;
    component.saved.subscribe((session) => {
      savedSession = session;
    });

    component.form.patchValue({
      fecha_sesion: '2024-03-15',
      semester: 1,
      modalidad: 'PRESENCIAL',
      resumen: 'Revisión de avances del semestre 1.'
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/v1/tutoring-sessions/');
    expect(req.request.method).toBe('POST');
    req.flush({
      tutoring_session_created_id: 10,
      mensaje: 'Sesión de tutoría registrada correctamente',
      tutoring_session: {
        id: 10,
        student: 1,
        semester: 1,
        fecha_sesion: '2024-03-15',
        modalidad: 'PRESENCIAL',
        resumen: 'Revisión de avances del semestre 1.',
        participants: [],
        observations: []
      }
    });

    expect(savedSession).toBeTruthy();
    expect(savedSession.id).toBe(10);
  });
});
