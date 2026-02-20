import { useStore } from '@nanostores/react';
import { memo, useEffect, useState, useRef } from 'react';
import { themeStore, setTheme, themeIsDark, initializeTheme, type Theme } from '~/lib/stores/theme';
import { IconButton } from './IconButton';
import { SunDim, MoonStar, ChevronDown, Check } from 'lucide-react';
import { classNames } from '~/utils/classNames';

interface ThemeSwitchProps {
  className?: string;
  variant?: 'icon' | 'menu';
}

const themes: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Use system default' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export const ThemeSwitch = memo(({ className, variant = 'menu' }: ThemeSwitchProps) => {
  const theme = useStore(themeStore);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    initializeTheme();
    setIsDark(themeIsDark());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setIsDark(themeIsDark());

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme, mounted]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const currentTheme = themes.find((t) => t.value === theme) || themes[0];

  if (!mounted) {
    if (variant === 'menu') {
      return (
        <div className={classNames('flex items-center justify-between py-4 border-b border-border', className)}>
          <div>
            <div className="text-sm font-medium text-foreground">Theme</div>
            <div className="text-sm text-muted-foreground">Description of this setting</div>
          </div>
          <div className="h-9 w-[180px] bg-muted rounded-md animate-pulse" />
        </div>
      );
    }
    return null;
  }

  if (variant === 'icon') {
    return (
      <IconButton
        className={className}
        icon={isDark ? <SunDim size={20} /> : <MoonStar size={20} />}
        size="xl"
        title={`Current: ${currentTheme.label}. Click to toggle.`}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
      />
    );
  }

  return (
    <div className={classNames('flex items-center justify-between py-4 border-b border-border', className)}>
      <div className="flex flex-col items-start gap-2">
        <div className="text-sm font-medium text-foreground">Theme</div>
        <div className="text-sm text-muted-foreground">Choose your preferred appearance</div>
      </div>

      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={classNames(
            'flex items-center gap-2 px-3 py-2 text-sm rounded-md border transition-colors min-w-[180px] justify-between',
            'bg-background border-border hover:border-ring text-foreground',
          )}
        >
          <span>{currentTheme.label}</span>
          <ChevronDown
            size={16}
            className={classNames('text-muted-foreground transition-transform', { 'rotate-180': isOpen })}
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 bottom-full mb-1 w-full min-w-[180px] bg-popover border border-border rounded-md shadow-lg z-50 py-1">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTheme(t.value);
                  setIsOpen(false);
                }}
                className={classNames(
                  'w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors',
                  theme === t.value ? 'text-foreground bg-accent' : 'text-foreground hover:bg-accent',
                )}
              >
                <span>{t.label}</span>
                {theme === t.value && <Check size={16} className="text-foreground" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

ThemeSwitch.displayName = 'ThemeSwitch';
