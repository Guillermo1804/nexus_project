import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  NgZone,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Modal behavior shared by every dialog in the app: moves focus into the panel
 * when it opens, keeps Tab cycling inside it, closes on Escape and restores
 * focus to the control that opened it. Without this, keyboard and screen
 * reader users stay stranded on the page rendered behind the dialog.
 */
@Directive({ selector: '[appModalFocus]', standalone: true })
export class ModalFocusDirective implements AfterViewInit, OnDestroy {
  @Output() readonly appModalEscape = new EventEmitter<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private previouslyFocused: HTMLElement | null = null;
  private previousOverflow = '';

  ngAfterViewInit(): void {
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this.onKeydown, true);
    queueMicrotask(() => this.focusInitial());
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.onKeydown, true);
    document.body.style.overflow = this.previousOverflow;
    this.previouslyFocused?.focus?.();
  }

  /** Replaces the last focusable element as the entry point, e.g. after the panel content loads. */
  focusInitial(): void {
    const preferred = this.host.nativeElement.querySelector<HTMLElement>('[data-modal-autofocus]');
    const target = preferred ?? this.focusable()[0] ?? this.host.nativeElement;
    if (!target.hasAttribute('tabindex') && target === this.host.nativeElement) target.tabIndex = -1;
    target.focus();
  }

  private focusable(): HTMLElement[] {
    return [...this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.getClientRects().length > 0 && el.getAttribute('aria-hidden') !== 'true',
    );
  }

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.zone.run(() => this.appModalEscape.emit());
      return;
    }
    if (event.key !== 'Tab') return;

    const items = this.focusable();
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const inside = !!active && this.host.nativeElement.contains(active);
    if (!inside) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };
}