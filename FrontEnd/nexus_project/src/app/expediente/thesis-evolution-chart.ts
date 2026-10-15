import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThesisHistoryEntry, ThesisHistoryResponse } from '../core/academic/academic.models';

@Component({
  selector: 'app-thesis-evolution-chart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './thesis-evolution-chart.html',
  styleUrl: './thesis-evolution-chart.scss',
})
export class ThesisEvolutionChartComponent implements OnChanges {
  @Input({ required: true }) history!: ThesisHistoryResponse | null;

  protected chartData: ThesisHistoryEntry[] = [];
  protected maxPercentage = 100;
  protected expandedEntry: ThesisHistoryEntry | null = null;
  protected compareEntry: ThesisHistoryEntry | null = null;
  protected compareTarget: ThesisHistoryEntry | null = null;
  protected showComparePanel = false;
  protected readonly componentKeys: string[] = ['protocolo', 'marco_teorico', 'metodologia', 'recoleccion_datos', 'analisis_resultados', 'redaccion_capitulos'];
  protected compareTargetId: number | string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['history'] && this.history) {
      this.chartData = this.history.historico;
      this.expandedEntry = null;
      this.compareEntry = null;
      this.compareTarget = null;
      this.showComparePanel = false;
    }
  }

  protected getYPosition(percentage: number): number {
    return 100 - (percentage / this.maxPercentage) * 90;
  }

  protected getXPosition(index: number): number {
    if (this.chartData.length <= 1) return 50;
    return (index / (this.chartData.length - 1)) * 90 + 5;
  }

  protected getLinePath(): string {
    if (this.chartData.length === 0) return '';
    const points = this.chartData.map((entry, i) => {
      const x = this.getXPosition(i);
      const y = this.getYPosition(entry.porcentaje_avance);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    });
    return points.join(' ');
  }

  protected toggleExpand(entry: ThesisHistoryEntry): void {
    this.expandedEntry = this.expandedEntry === entry ? null : entry;
  }

  protected startCompare(entry: ThesisHistoryEntry): void {
    this.compareEntry = entry;
    this.showComparePanel = true;
  }

  protected closeCompare(): void {
    this.showComparePanel = false;
    this.compareEntry = null;
    this.compareTarget = null;
  }

  protected onCompareTargetChange(targetId: number | string): void {
    const id = Number(targetId);
    this.compareTarget = this.chartData.find(e => e.id === id) ?? null;
  }

  protected getComponentLabel(key: string): string {
    const labels: Record<string, string> = {
      protocolo: 'Protocolo y delimitación',
      marco_teorico: 'Estado del arte y marco teórico',
      metodologia: 'Metodología y diseño experimental',
      recoleccion_datos: 'Desarrollo / Recolección de datos',
      analisis_resultados: 'Análisis de resultados',
      redaccion_capitulos: 'Redacción de capítulos de tesis',
    };
    return labels[key] ?? key;
  }

  protected getDeltaClass(delta: number): string {
    if (delta > 0) return 'delta-positive';
    if (delta < 0) return 'delta-negative';
    return 'delta-zero';
  }

  protected getStagnationClass(entry: ThesisHistoryEntry): string {
    return entry.estancamiento_detectado ? 'stagnation' : '';
  }

  protected getComponentValue(entry: ThesisHistoryEntry, key: string): number {
    return (entry.componentes_json as Record<string, number>)?.[key] ?? 0;
  }
}