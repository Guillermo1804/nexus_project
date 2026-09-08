import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PillBadgeComponent, PillBadgeType } from './pill-badge.component';

describe('PillBadgeComponent', () => {
  let component: PillBadgeComponent;
  let fixture: ComponentFixture<PillBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PillBadgeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PillBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should apply correct CSS classes for PENDIENTE status', () => {
    fixture.componentRef.setInput('type', 'PENDIENTE');
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();

    const spanElement: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(spanElement.classList).toContain('pill-badge--pendiente');
    expect(spanElement.classList).toContain('pill-badge--sm');
  });

  it('should apply correct CSS classes for EN_PROCESO status', () => {
    fixture.componentRef.setInput('type', 'EN_PROCESO');
    fixture.detectChanges();

    const spanElement: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(spanElement.classList).toContain('pill-badge--en-proceso');
    expect(spanElement.classList).toContain('pill-badge--md');
  });

  it('should apply correct CSS classes for CONCLUIDO status', () => {
    fixture.componentRef.setInput('type', 'CONCLUIDO');
    fixture.detectChanges();

    const spanElement: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(spanElement.classList).toContain('pill-badge--concluido');
  });

  it('should apply correct CSS classes for VENCIDO status', () => {
    fixture.componentRef.setInput('type', 'VENCIDO');
    fixture.detectChanges();

    const spanElement: HTMLElement = fixture.nativeElement.querySelector('span');
    expect(spanElement.classList).toContain('pill-badge--vencido');
  });

  it('should display custom text when provided', () => {
    fixture.componentRef.setInput('type', 'PENDIENTE');
    fixture.componentRef.setInput('text', '3 días restantes');
    fixture.detectChanges();

    const textElement: HTMLElement = fixture.nativeElement.querySelector('.pill-badge__text');
    expect(textElement.textContent?.trim()).toBe('3 días restantes');
  });

  it('should render dot indicator when showDot is true', () => {
    fixture.componentRef.setInput('showDot', true);
    fixture.detectChanges();

    const dotElement = fixture.nativeElement.querySelector('.pill-badge__dot');
    expect(dotElement).toBeTruthy();
  });
});
