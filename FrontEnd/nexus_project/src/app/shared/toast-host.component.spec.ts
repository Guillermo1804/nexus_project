import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastHostComponent } from './toast-host.component';
import { ToastService } from './toast.service';

describe('ToastHostComponent', () => {
  let fixture: ComponentFixture<ToastHostComponent>;
  let toasts: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ToastHostComponent] }).compileComponents();
    toasts = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ToastHostComponent);
    fixture.detectChanges();
  });

  afterEach(() => toasts.limpiar());

  const avisos = (): HTMLElement[] => [...fixture.nativeElement.querySelectorAll('.toast')];

  it('no muestra nada mientras no haya acciones', () => {
    expect(avisos().length).toBe(0);
  });

  it('anuncia los errores con role alert para que el lector de pantalla los lea', () => {
    toasts.error('No fue posible guardar.');
    fixture.detectChanges();

    expect(avisos().length).toBe(1);
    expect(avisos()[0].getAttribute('role')).toBe('alert');
    expect(avisos()[0].textContent).toContain('No fue posible guardar.');
  });

  it('anuncia los éxitos con role status, sin interrumpir al lector', () => {
    toasts.exito('Tutoría registrada.');
    fixture.detectChanges();

    expect(avisos()[0].getAttribute('role')).toBe('status');
  });

  it('el aviso se puede cerrar desde su propio botón', () => {
    toasts.exito('Tutoría registrada.');
    fixture.detectChanges();

    const cerrar = avisos()[0].querySelector('button') as HTMLButtonElement;
    cerrar.click();
    fixture.detectChanges();

    expect(avisos().length).toBe(0);
  });

  it('acumula varios avisos sin que se pisen entre sí', () => {
    toasts.exito('Uno.');
    toasts.exito('Dos.');
    fixture.detectChanges();

    const textos = avisos().map((el) => el.textContent ?? '');
    expect(textos.length).toBe(2);
    expect(textos[0]).toContain('Uno.');
    expect(textos[1]).toContain('Dos.');
  });
});