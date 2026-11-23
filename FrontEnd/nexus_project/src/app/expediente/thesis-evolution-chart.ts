import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThesisComponentKey, ThesisHistoryEntry, ThesisHistoryResponse } from '../core/academic/academic.models';

@Component({
  selector: 'app-thesis-evolution-chart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './thesis-evolution-chart.html',
  styleUrl: './thesis-evolution-chart.scss',
})
export class ThesisEvolutionChartComponent implements OnChanges {
  @Input({ required: true }) history!: ThesisHistoryResponse | null;
  @Input() canDeleteEntries = false;
  @Output() deleteEntry = new EventEmitter<ThesisHistoryEntry>();

  protected chartData: ThesisHistoryEntry[] = [];
  protected maxPercentage = 100;
  protected readonly chartWidth = 450;
  protected readonly chartHeight = 100;
  protected readonly chartPadding = { top: 8, right: 8, bottom: 14, left: 24 };
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
    const boundedPercentage = Math.min(Math.max(percentage, 0), this.maxPercentage);
    const plotHeight = this.chartHeight - this.chartPadding.top - this.chartPadding.bottom;
    return this.chartPadding.top + (1 - boundedPercentage / this.maxPercentage) * plotHeight;
  }

  protected getXPosition(index: number): number {
    const plotWidth = this.chartWidth - this.chartPadding.left - this.chartPadding.right;
    if (this.chartData.length <= 1) return this.chartWidth / 2;
    return this.chartPadding.left + (index / (this.chartData.length - 1)) * plotWidth;
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
    this.compareTargetId = '';
    this.compareTarget = null;
    this.showComparePanel = true;
  }

  protected closeCompare(): void {
    this.showComparePanel = false;
    this.compareEntry = null;
    this.compareTarget = null;
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeCompare();
  }

  protected onCompareTargetChange(targetId: number | string): void {
    const id = Number(targetId);
    this.compareTarget = this.chartData.find(e => e.id === id) || null;
    if (this.compareTarget) {
      this.compareTargetId = id.toString();
    }
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
    if (!entry || !entry.componentes_json) return 0;
    const value = entry.componentes_json[key as ThesisComponentKey];
    return value !== undefined ? value : 0;
  }
}