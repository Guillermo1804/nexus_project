import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({});
  });

  it('starts in light mode when no preference has been saved', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.isDark()).toBeFalse();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggles dark mode and persists the preference', () => {
    const service = TestBed.inject(ThemeService);

    service.toggle();

    expect(service.isDark()).toBeTrue();
    expect(localStorage.getItem('nexus-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('restores a saved dark mode preference', () => {
    localStorage.setItem('nexus-theme', 'dark');

    const service = TestBed.inject(ThemeService);

    expect(service.isDark()).toBeTrue();
  });
});
