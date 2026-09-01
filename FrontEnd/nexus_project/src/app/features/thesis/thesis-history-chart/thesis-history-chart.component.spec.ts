import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ThesisHistoryChartComponent } from './thesis-history-chart.component';
import { ThesisService } from '../../../core/services/thesis.service';
import { ThesisHistoryResponse } from '../../../core/models/thesis.model';

describe('ThesisHistoryChartComponent', () => {
  let component: ThesisHistoryChartComponent;
  let fixture: ComponentFixture<ThesisHistoryChartComponent>;
  let thesisService: ThesisService;

  const mockHistoryData: ThesisHistoryResponse = {
    student_id: 1,
    student_matricula: 'DOC-2025-001',
    student_nombre: 'Juan Pérez',
    total_registros: 2,
    progreso_actual: 45,
    historico: [
      {
        semester_numero: 1,
        porcentaje_avance: 20,
        fecha_registro: '2024-06-15',
        componentes: {
          protocolo: 100,
          estadoArte: 60,
          marcoTeorico: 20,
          metodologia: 0,
          analisis: 0,
          redaccion: 0
        },
        observaciones: 'Protocolo aprobado'
      },
      {
        semester_numero: 2,
        porcentaje_avance: 45,
        fecha_registro: '2024-12-10',
        componentes: {
          protocolo: 100,
          estadoArte: 100,
          marcoTeorico: 70,
          metodologia: 40,
          analisis: 10,
          redaccion: 0
        },
        observaciones: 'Marco teórico completado'
      }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        ThesisHistoryChartComponent
      ],
      providers: [ThesisService]
    }).compileComponents();

    thesisService = TestBed.inject(ThesisService);
    spyOn(thesisService, 'getThesisHistory').and.returnValue(of(mockHistoryData));

    fixture = TestBed.createComponent(ThesisHistoryChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('studentId', 1);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load history data and calculate 6 semesters evolution', () => {
    expect(thesisService.getThesisHistory).toHaveBeenCalledWith(1);
    expect(component.currentOverallProgress()).toBe(45);
    expect(component.totalRecordsCount()).toBe(2);

    const evolution = component.semesterEvolution();
    expect(evolution.length).toBe(6);
    expect(evolution[0].semesterNumber).toBe(1);
    expect(evolution[0].percentage).toBe(20);
    expect(evolution[0].hasRecord).toBeTrue();

    expect(evolution[1].semesterNumber).toBe(2);
    expect(evolution[1].percentage).toBe(45);
    expect(evolution[1].hasRecord).toBeTrue();

    expect(evolution[2].semesterNumber).toBe(3);
    expect(evolution[2].percentage).toBe(0);
    expect(evolution[2].hasRecord).toBeFalse();
  });

  it('should select semester and update detailed breakdown', () => {
    component.selectSemester(1);
    expect(component.selectedSemesterNumber()).toBe(1);

    const detail = component.selectedSemesterDetail();
    expect(detail).toBeTruthy();
    expect(detail?.semesterNumber).toBe(1);
    expect(detail?.components.protocolo).toBe(100);
    expect(detail?.components.estadoArte).toBe(60);
  });
});
