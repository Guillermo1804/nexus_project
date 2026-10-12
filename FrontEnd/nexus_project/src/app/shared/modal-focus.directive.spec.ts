import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { ModalFocusDirective } from './modal-focus.directive';

@Component({
  imports: [ModalFocusDirective],
  template: `
    <button id="trigger">Abrir</button>
    @if (open) {
      <section appModalFocus role="dialog" aria-modal="true" (appModalEscape)="onEscape()">
        <button id="first">Primero</button>
        <button id="middle">Medio</button>
        <button id="last">Ultimo</button>
      </section>
    }
  `,
})
class HostComponent {
  open = true;
  escapes = 0;

  onEscape(): void {
    this.escapes++;
  }
}

describe('ModalFocusDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const press = (key: string, shiftKey = false): void => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    document.body.style.overflow = '';
  });

  it('moves focus into the dialog when it opens', fakeAsync(() => {
    const trigger = fixture.nativeElement.querySelector('#trigger') as HTMLButtonElement;
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fixture.detectChanges();
    flushMicrotasks();

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#first'));
  }));

  it('wraps Tab from the last control back to the first', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    (fixture.nativeElement.querySelector('#last') as HTMLButtonElement).focus();

    press('Tab');

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#first'));
  }));

  it('wraps Shift+Tab from the first control back to the last', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    (fixture.nativeElement.querySelector('#first') as HTMLButtonElement).focus();

    press('Tab', true);

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#last'));
  }));

  it('pulls focus back in when it has escaped the dialog', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();
    (fixture.nativeElement.querySelector('#trigger') as HTMLButtonElement).focus();

    press('Tab');

    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#first'));
  }));

  it('emits on Escape without closing itself', fakeAsync(() => {
    fixture.detectChanges();
    flushMicrotasks();

    press('Escape');

    expect(host.escapes).toBe(1);
    expect(fixture.nativeElement.querySelector('#first')).toBeTruthy();
  }));

  it('restores focus to the trigger and the scroll position when it closes', fakeAsync(() => {
    const trigger = fixture.nativeElement.querySelector('#trigger') as HTMLButtonElement;
    trigger.focus();
    fixture.detectChanges();
    flushMicrotasks();
    expect(document.body.style.overflow).toBe('hidden');

    host.open = false;
    fixture.detectChanges();
    tick();

    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe('');
  }));
});