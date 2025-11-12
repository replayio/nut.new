import { atom } from 'nanostores';
import { logStore } from './logs';

export type Theme = 'dark' | 'light' | 'system';

export const kTheme = 'bolt_theme';

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function getEffectiveTheme(theme: Theme): 'dark' | 'light' {
  return theme === 'system' ? getSystemTheme() : theme;
}

export function themeIsDark() {
  return getEffectiveTheme(themeStore.get()) === 'dark';
}

export const DEFAULT_THEME: Theme = 'system';

export const themeStore = atom<Theme>(initStore());

function initStore() {
  if (!import.meta.env.SSR) {
    const persistedTheme = localStorage.getItem(kTheme) as Theme | undefined;
    if (persistedTheme && ['dark', 'light', 'system'].includes(persistedTheme)) {
      return persistedTheme;
    }
    // If no persisted theme, default to system
    return DEFAULT_THEME;
  }

  return DEFAULT_THEME;
}

export function setTheme(theme: Theme) {
  themeStore.set(theme);
  const effectiveTheme = getEffectiveTheme(theme);
  logStore.logSystem(`Theme changed to ${theme} mode (effective: ${effectiveTheme})`);
  localStorage.setItem(kTheme, theme);
  document.querySelector('html')?.setAttribute('data-theme', effectiveTheme);
}

export function toggleTheme() {
  const currentTheme = themeStore.get();
  // Cycle through: system -> light -> dark -> system
  const newTheme: Theme = currentTheme === 'system' ? 'light' : currentTheme === 'light' ? 'dark' : 'system';
  setTheme(newTheme);
}

// Listen for system theme changes when theme is set to 'system'
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = () => {
    if (themeStore.get() === 'system') {
      const effectiveTheme = getSystemTheme();
      document.querySelector('html')?.setAttribute('data-theme', effectiveTheme);
    }
  };
  mediaQuery.addEventListener('change', handleSystemThemeChange);
}
