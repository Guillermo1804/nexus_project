import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { AcademicService } from '../core/academic/academic.service';
import { ToastService } from '../shared/toast.service';
import { EventFormComponent } from './event-form';

describe('EventFormComponent', () => {
  let fixture: ComponentFixture<EventFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventFormComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['id', '1'], ['eventId', null]]) } },
        },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        {
          provide: AcademicService,
          useValue: {
            getEvents: jasmine.createSpy('getEvents').and.returnValue(of({ results: [] })),
            getStudentOverview: jasmine.createSpy('getStudentOverview'),
            uploadEventEvidence: jasmine.createSpy('uploadEventEvidence'),
            createEvent: jasmine.createSpy('createEvent'),
          },
        },
        { provide: ToastService, useValue: { exito: jasmine.createSpy('exito'), error: jasmine.createSpy('error') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventFormComponent);
    fixture.detectChanges();
  });

  it('habilita el registro de un ponente al seleccionar una constancia', () => {
    const component = fixture.componentInstance as EventFormComponent & {
      form: { invalid: boolean };
      onFileChange(event: Event): void;
    };
    const file = new File(['constancia'], 'constancia.pdf', { type: 'application/pdf' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });

    expect(component.form.invalid).toBeTrue();

    component.onFileChange({ target: input } as unknown as Event);

    expect(component.form.invalid).toBeFalse();
  });
});
