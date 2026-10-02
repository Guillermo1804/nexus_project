import { Component, input, output } from '@angular/core';
import { ModalFocusDirective } from './modal-focus.directive';

export interface ConfirmRequest {
  title: string;
  /** Qué ocurre y a qué afecta. Debe nombrar el elemento para que no haya dudas. */
  message: string;
  /** Consecuencia irreversible, en tono de aviso. */
  warning?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` pinta la acción principal en rojo; úsese al borrar. */
  tone?: 'danger' | 'primary';
}

/**
 * Confirmación para acciones destructivas. El botón que la dispara no borra nada:
 * sólo publica la solicitud y espera `confirmed`, de modo que un clic perdido o una
 * tecla Escape no ejecutan nada.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [ModalFocusDirective],
  template: `
    <div class="modal-backdrop" (click)="onBackdrop($event)">
      <section class="modal-panel" appModalFocus role="alertdialog" aria-modal="true"
        [attr.aria-labelledby]="titleId" [attr.aria-describedby]="messageId"
        (appModalEscape)="cancel()">
        <header class="confirm-header">
          <span class="confirm-icon" aria-hidden="true">!</span>
          <h2 [id]="titleId">{{ request().title }}</h2>
        </header>
        <div class="confirm-body">
          <p [id]="messageId">{{ request().message }}</p>
          @if (request().warning) {
            <p class="confirm-warning">{{ request().warning }}</p>
          }
        </div>
        <footer class="confirm-actions">
          <button type="button" class="btn-secondary" data-modal-autofocus (click)="cancel()">
            {{ request().cancelLabel ?? 'Cancelar' }}
          </button>
          <button type="button" class="btn-danger" (click)="confirm()">
            {{ request().confirmLabel }}
          </button>
        </footer>
      </section>
    </div>
  `,
  styles: `
    .modal-panel { max-width: 440px; padding: 24px; width: calc(100vw - 32px); }
    .confirm-header { align-items: center; display: flex; gap: 12px; }
    .confirm-header h2 { font-size: 18px; margin: 0; }
    .confirm-icon {
      align-items: center; background: var(--danger-bg, #fdecec); border-radius: 50%;
      color: var(--danger); display: inline-flex; flex-shrink: 0; font-weight: 800;
      height: 32px; justify-content: center; width: 32px;
    }
    .confirm-body { margin: 16px 0 20px; }
    .confirm-body p { color: var(--text-secondary); font-size: 14px; line-height: 1.6; margin: 0; }
    .confirm-warning {
      background: var(--warning-bg, #fff6e5); border-radius: var(--radius-control, 8px);
      color: var(--text); font-size: 13px; margin-top: 12px; padding: 10px 12px;
    }
    .confirm-actions { display: flex; gap: 10px; justify-content: flex-end; }
    @media (max-width: 520px) {
      .modal-panel { padding: 18px; }
      .confirm-actions { flex-direction: column-reverse; }
      .confirm-actions button { width: 100%; }
    }
  `,
})
export class ConfirmDialogComponent {
  readonly request = input.required<ConfirmRequest>();
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
  protected readonly titleId = 'confirm-dialog-title';
  protected readonly messageId = 'confirm-dialog-message';

  protected confirm(): void { this.confirmed.emit(); }
  protected cancel(): void { this.cancelled.emit(); }

  /**
   * Cierra al pulsar el fondo. Devuelve void a propósito: un binding de Angular que
   * evalúa a false llama a preventDefault() y anularía los clics dentro del diálogo.
   */
  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.cancel();
  }
}