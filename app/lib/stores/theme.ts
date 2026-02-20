import { atom } from 'nanostores';
import { logStore } from './logs';

export type Theme = 'dark' | 'light' | 'system';

export const kTheme = 'bolt_theme';

export const DEFAULT_THEME: Theme = 'system';

export const themeStore = atom<Theme>(DEFAULT_THEME);

export function themeIsDark(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const theme = themeStore.get();
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return theme === 'dark';
}

function getEffectiveTheme(theme: Theme): 'dark' | 'light' {
  if (typeof window === 'undefined') {
    return 'light';
  }
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

let systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null;

function setupSystemThemeListener() {
  if (typeof window === 'undefined' || systemThemeListener) {
    return;
  }
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemThemeListener = (e: MediaQueryListEvent) => {
    if (themeStore.get() === 'system') {
      const effectiveTheme = e.matches ? 'dark' : 'light';
      applyThemeToDOM(effectiveTheme);
    }
  };
  mediaQuery.addEventListener('change', systemThemeListener);
}

function removeSystemThemeListener() {
  if (typeof window === 'undefined' || !systemThemeListener) {
    return;
  }
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.removeEventListener('change', systemThemeListener);
  systemThemeListener = null;
}

function applyThemeToDOM(effectiveTheme: 'dark' | 'light') {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.setAttribute('data-theme', effectiveTheme);
  document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
}

export function setTheme(theme: Theme) {
  themeStore.set(theme);
  logStore.logSystem(`Theme changed to ${theme} mode`);

  if (typeof window !== 'undefined') {
    localStorage.setItem(kTheme, theme);
    const effectiveTheme = getEffectiveTheme(theme);
    applyThemeToDOM(effectiveTheme);

    if (theme === 'system') {
      setupSystemThemeListener();
    } else {
      removeSystemThemeListener();
    }
  }
}

export function initializeTheme() {
  if (typeof window === 'undefined') {
    return;
  }

  const persistedTheme = localStorage.getItem(kTheme) as Theme | null;
  const initialTheme = persistedTheme ?? DEFAULT_THEME;

  themeStore.set(initialTheme);

  const effectiveTheme = getEffectiveTheme(initialTheme);
  applyThemeToDOM(effectiveTheme);

  if (initialTheme === 'system') {
    setupSystemThemeListener();
  }
}

export function toggleTheme() {
  const currentTheme = themeStore.get();
  const effectiveTheme = getEffectiveTheme(currentTheme);
  const newTheme = effectiveTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

export function cycleTheme() {
  const currentTheme = themeStore.get();
  const themes: Theme[] = ['light', 'dark', 'system'];
  const currentIndex = themes.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % themes.length;
  setTheme(themes[nextIndex]);
}

// Auto-initialize on client side
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTheme);
  } else {
    initializeTheme();
  }
}
