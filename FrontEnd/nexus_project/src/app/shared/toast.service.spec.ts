import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => service.limpiar());

  it('empieza sin avisos', () => {
    expect(service.toasts()).toEqual([]);
  });

  it('añade un aviso de éxito con su tono', () => {
    service.exito('Acuerdo registrado.');
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].tone).toBe('success');
    expect(service.toasts()[0].mensaje).toBe('Acuerdo registrado.');
  });

  it('acepta varios avisos a la vez sin pisarse', () => {
    service.exito('Primero.');
    service.error('Segundo.');
    service.info('Tercero.');

    expect(service.toasts().map((toast) => toast.tone)).toEqual(['success', 'error', 'info']);
    expect(service.toasts().map((toast) => toast.id)).toEqual([0, 1, 2]);
  });

  it('cierra el aviso pasado su tiempo', fakeAsync(() => {
    service.exito('Se va solo.');
    expect(service.toasts().length).toBe(1);

    tick(4500);
    expect(service.toasts()).toEqual([]);
  }));

  it('permite cerrar un aviso antes de tiempo', fakeAsync(() => {
    service.exito('Manual.');
    const id = service.toasts()[0].id;

    service.cerrar(id);
    expect(service.toasts()).toEqual([]);

    // El temporizador pendiente no debe dejar avisos atrás al terminar la prueba.
    tick(4500);
    expect(service.toasts()).toEqual([]);
  }));
});