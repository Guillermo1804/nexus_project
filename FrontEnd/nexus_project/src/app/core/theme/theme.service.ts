import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'nexus-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly isDark = signal(this.readInitialTheme() === 'dark');

  constructor() {
    this.applyTheme(this.isDark() ? 'dark' : 'light');
  }

  toggle(): void {
    const theme: Theme = this.isDark() ? 'light' : 'dark';
    this.isDark.set(theme === 'dark');
    this.applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  private readInitialTheme(): Theme {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;

    return this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyTheme(theme: Theme): void {
    this.document.documentElement.setAttribute('data-theme', theme);
  }
}
