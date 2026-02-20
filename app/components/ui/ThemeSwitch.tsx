import { useStore } from '@nanostores/react';
import { memo, useEffect, useState } from 'react';
import { themeStore, toggleTheme, cycleTheme, themeIsDark, initializeTheme, type Theme } from '~/lib/stores/theme';
import { IconButton } from './IconButton';
import { SunDim, MoonStar, Monitor } from 'lucide-react';

interface ThemeSwitchProps {
  className?: string;
  variant?: 'icon' | 'menu';
}

const getThemeIcon = (theme: Theme, isDark: boolean) => {
  if (theme === 'system') {
    return <Monitor size={20} className="text-muted-foreground" />;
  }
  return isDark ? <MoonStar size={20} className="text-muted-foreground" /> : <SunDim size={20} className="text-muted-foreground" />;
};

const getThemeLabel = (theme: Theme) => {
  switch (theme) {
    case 'light':
      return 'Light';
    case 'dark':
      return 'Dark';
    case 'system':
      return 'System';
  }
};

export const ThemeSwitch = memo(({ className, variant = 'menu' }: ThemeSwitchProps) => {
  const theme = useStore(themeStore);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

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

  if (!mounted) {
    if (variant === 'menu') {
      return (
        <div className="w-full flex items-center gap-4 text-foreground">
          <div className="w-5 h-5" />
          <span className="font-medium">Theme</span>
          <span className="ml-auto text-sm text-muted-foreground">Loading...</span>
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
        title={`Current: ${getThemeLabel(theme)} mode. Click to toggle.`}
        onClick={toggleTheme}
      />
    );
  }

  return (
    <button
      onClick={cycleTheme}
      className="w-full flex items-center gap-4 text-foreground hover:bg-accent transition-colors duration-150"
    >
      {getThemeIcon(theme, isDark)}
      <span className="font-medium">Theme</span>
      <span className="ml-auto text-sm text-muted-foreground">{getThemeLabel(theme)}</span>
    </button>
  );
});

ThemeSwitch.displayName = 'ThemeSwitch';
