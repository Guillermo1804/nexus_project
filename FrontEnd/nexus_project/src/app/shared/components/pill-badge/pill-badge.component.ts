import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type PillBadgeType = 
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'CONCLUIDO'
  | 'VENCIDO'
  | 'ACTIVO'
  | 'INACTIVO'
  | 'INFO'
  | 'SUCCESS'
  | 'DEFAULT'
  | 'ALTO'
  | 'MEDIO'
  | 'BAJO'
  | 'CRITICO'
  | 'CANCELADO'
  | 'URGENTE'
  | string;

export type PillBadgeSize = 'sm' | 'md';

@Component({
  selector: 'app-pill-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pill-badge.component.html',
  styleUrls: ['./pill-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PillBadgeComponent {
  readonly type = input<PillBadgeType | undefined>(undefined);
  readonly tipo = input<PillBadgeType | undefined>(undefined);
  readonly text = input<string | undefined>(undefined);
  readonly texto = input<string | undefined>(undefined);
  readonly size = input<PillBadgeSize>('md');
  readonly showDot = input<boolean>(false);

  readonly resolvedType = computed<string>(() => {
    return (this.type() || this.tipo() || 'INFO').toUpperCase();
  });

  // Normalized label if text is empty
  readonly displayLabel = computed(() => {
    const customText = this.text() ?? this.texto();
    if (customText !== undefined && customText !== null && customText !== '') return customText;
    
    switch (this.resolvedType()) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'EN_PROCESO':
        return 'En Proceso';
      case 'CONCLUIDO':
        return 'Concluido';
      case 'VENCIDO':
        return 'Vencido';
      case 'ACTIVO':
        return 'Activo';
      case 'INACTIVO':
        return 'Inactivo';
      case 'SUCCESS':
        return 'Éxito';
      case 'CRITICO':
      case 'ALTO':
        return 'Crítico';
      case 'MEDIO':
        return 'Medio';
      case 'BAJO':
        return 'Bajo';
      case 'DEFAULT':
      case 'INFO':
      default:
        return 'Info';
    }
  });

  readonly badgeClasses = computed(() => {
    const normType = this.resolvedType().toLowerCase().replace(/_/g, '-');
    return `pill-badge pill-badge--${normType} pill-badge--${this.size()}`;
  });
}
