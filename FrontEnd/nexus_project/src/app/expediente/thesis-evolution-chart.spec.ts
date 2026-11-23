import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThesisEvolutionChartComponent } from './thesis-evolution-chart';

describe('ThesisEvolutionChartComponent', () => {
  let fixture: ComponentFixture<ThesisEvolutionChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThesisEvolutionChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ThesisEvolutionChartComponent);
    fixture.componentRef.setInput('history', {
      historico: [
        {
          id: 1,
          semestre_numero: '4',
          fecha: '2026-01-01',
          porcentaje_avance: 70,
          delta_porcentaje: 0,
          estancamiento_detectado: false,
          componentes_json: {
            protocolo: 0,
            marco_teorico: 0,
            metodologia: 0,
            recoleccion_datos: 0,
            analisis_resultados: 0,
            redaccion_capitulos: 0,
          },
        },
      ],
      total_registros: 1,
    });
    fixture.detectChanges();
  });

  it('renders percentage labels without horizontal distortion or bold weight', () => {
    const chart = fixture.nativeElement.querySelector('svg');
    const labels = Array.from(fixture.nativeElement.querySelectorAll('.y-mark text')) as SVGTextElement[];

    expect(chart.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect(chart.getAttribute('viewBox')).toBe('0 0 450 100');
    expect(labels.map(label => label.textContent?.trim())).toEqual(['0%', '25%', '50%', '75%', '100%']);
    expect(labels.every(label => label.getAttribute('font-weight') === '400')).toBeTrue();
    expect(labels.every(label => label.getAttribute('stroke') === 'none')).toBeTrue();
  });
});
