import { useStore } from '@nanostores/react';
import { memo, useEffect, useState } from 'react';
import { themeStore, setTheme } from '~/lib/stores/theme';
import { Monitor, Sun, Moon } from 'lucide-react';
import { classNames } from '~/utils/classNames';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle = memo(({ className }: ThemeToggleProps) => {
  const theme = useStore(themeStore);
  const [domLoaded, setDomLoaded] = useState(false);

  useEffect(() => {
    setDomLoaded(true);
  }, []);

  if (!domLoaded) {
    return null;
  }

  const themes = [
    { value: 'system' as const, icon: Monitor, label: 'System' },
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
  ];

  return (
    <div className={classNames('flex flex-col gap-2', className)}>
      <div className="text-sm font-medium text-bolt-elements-textPrimary mb-1">Theme</div>
      <div className="flex items-center gap-1.5 bg-bolt-elements-background-depth-1 rounded-lg p-1 border border-bolt-elements-borderColor">
        {themes.map(({ value, icon: Icon, label }) => {
          const isSelected = theme === value;
          return (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={classNames(
                'flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus focus:ring-offset-1',
                isSelected
                  ? 'bg-bolt-elements-background-depth-3 shadow-sm'
                  : 'bg-transparent hover:bg-bolt-elements-background-depth-2',
              )}
              title={label}
              aria-label={`Set theme to ${label}`}
            >
              <Icon
                size={16}
                className={classNames(
                  'stroke-[1.5]',
                  isSelected
                    ? 'text-bolt-elements-textPrimary'
                    : 'text-bolt-elements-textSecondary',
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
});

ThemeToggle.displayName = 'ThemeToggle';

