import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ThesisProgressFormComponent } from './thesis-progress-form.component';
import { ThesisService } from '../../../core/services/thesis.service';

describe('ThesisProgressFormComponent', () => {
  let component: ThesisProgressFormComponent;
  let fixture: ComponentFixture<ThesisProgressFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        ReactiveFormsModule,
        ThesisProgressFormComponent
      ],
      providers: [ThesisService]
    }).compileComponents();

    fixture = TestBed.createComponent(ThesisProgressFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default 0 progress and components', () => {
    expect(component.form.get('porcentaje_avance')?.value).toBe(0);
    expect(component.calculatedAverage()).toBe(0);
  });
});
