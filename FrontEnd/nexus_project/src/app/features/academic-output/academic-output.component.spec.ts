import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AcademicOutputComponent } from './academic-output.component';
import { AcademicOutputService } from '../../core/services/academic-output.service';
import { StudentService } from '../../core/services/student.service';

describe('AcademicOutputComponent', () => {
  let component: AcademicOutputComponent;
  let fixture: ComponentFixture<AcademicOutputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        ReactiveFormsModule,
        AcademicOutputComponent
      ],
      providers: [
        AcademicOutputService,
        StudentService,
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ studentId: '1', tab: 'PUBLICACIONES' })
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AcademicOutputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the academic output component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with active tab PUBLICACIONES', () => {
    expect(component.activeTab()).toBe('PUBLICACIONES');
  });

  it('should allow switching tabs', () => {
    component.selectTab('CONGRESOS');
    expect(component.activeTab()).toBe('CONGRESOS');

    component.selectTab('ESTANCIAS');
    expect(component.activeTab()).toBe('ESTANCIAS');

    component.selectTab('PRODUCTOS');
    expect(component.activeTab()).toBe('PRODUCTOS');
  });

  it('should validate publication form requirement', () => {
    component.publicationForm.reset();
    expect(component.publicationForm.valid).toBeFalse();

    component.publicationForm.patchValue({
      titulo: 'Test Article',
      autores_texto: 'Author, A.',
      tipo: 'ARTICULO_JCR',
      revista_editorial: 'IEEE Trans',
      estado: 'PUBLICADO'
    });
    expect(component.publicationForm.valid).toBeTrue();
  });
});
