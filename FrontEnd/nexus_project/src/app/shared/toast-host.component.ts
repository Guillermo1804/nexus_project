import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/**
 * Renderiza los avisos de `ToastService`. Se monta una vez en `AppShell`, así que
 * cualquier acción de cualquier pantalla confirma su resultado sin que cada
 * componente tenga que escribir su propio mensaje.
 */
@Component({
  selector: 'app-toast-host',
  template: `
    <div class="toast-stack" role="region" aria-label="Notificaciones">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="'toast ' + toast.tone" [attr.role]="toast.tone === 'error' ? 'alert' : 'status'">
          <span class="toast-icon" aria-hidden="true">{{ icon(toast.tone) }}</span>
          <p>{{ toast.mensaje }}</p>
          <button type="button" (click)="toasts.cerrar(toast.id)" aria-label="Cerrar aviso">×</button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-stack {
      bottom: 20px; display: grid; gap: 10px; justify-items: stretch;
      left: 20px; max-width: min(420px, calc(100vw - 40px)); position: fixed; z-index: 1400;
    }
    .toast {
      align-items: flex-start; animation: toast-in var(--motion-slow, 220ms) var(--ease-out, cubic-bezier(.2, .8, .3, 1)) both;
      background: var(--surface); border: 1px solid var(--border); border-left: 4px solid var(--brand);
      border-radius: 10px; box-shadow: var(--shadow-modal); display: flex; gap: 10px; padding: 12px 14px;
    }
    .toast.success { border-left-color: var(--success); }
    .toast.error { border-left-color: var(--danger); }
    .toast p { color: var(--text); flex: 1; font-size: 13px; line-height: 1.45; margin: 0; }
    .toast-icon { align-items: center; display: inline-flex; flex-shrink: 0; font-weight: 800; height: 20px; justify-content: center; width: 20px; }
    .toast.success .toast-icon { color: var(--success); }
    .toast.error .toast-icon { color: var(--danger); }
    .toast.info .toast-icon { color: var(--brand); }
    .toast button { background: none; border: 0; color: var(--text-muted); cursor: pointer; font-size: 18px; line-height: 1; padding: 0 2px; }
    @keyframes toast-in { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .toast { animation: none; } }
  `,
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);

  protected icon(tone: 'success' | 'error' | 'info'): string {
    return { success: '✓', error: '!', info: 'i' }[tone];
  }
}