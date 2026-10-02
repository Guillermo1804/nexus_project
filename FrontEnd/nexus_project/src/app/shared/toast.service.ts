import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info';

/**
 * Avisos efímeros de una sola acción.
 *
 * Hasta ahora el resultado de guardar sólo se comunicaba con un mensaje incrustado
 * que desaparecía al recargar, o no se comunicaba: la evidencia subida no confirmaba
 * nada y un rechazo por regla de negocio (un acuerdo vencido, una tutoría que aún no
 * ocurre) sólo se veía si el formulario se quedaba abierto.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private static readonly DURACION_MS = 4500;

  readonly toasts = signal<Toast[]>([]);
  private siguienteId = 0;

  exito(mensaje: string): void { this.mostrar(mensaje, 'success'); }
  error(mensaje: string): void { this.mostrar(mensaje, 'error'); }
  info(mensaje: string): void { this.mostrar(mensaje, 'info'); }

  mostrar(mensaje: string, tone: ToastTone = 'info'): void {
    const toast: Toast = { id: this.siguienteId++, mensaje, tone };
    this.toasts.update((current) => [...current, toast]);
    setTimeout(() => this.cerrar(toast.id), ToastService.DURACION_MS);
  }

  cerrar(id: number): void {
    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }

  limpiar(): void { this.toasts.set([]); }
}

export interface Toast {
  id: number;
  mensaje: string;
  tone: ToastTone;
}