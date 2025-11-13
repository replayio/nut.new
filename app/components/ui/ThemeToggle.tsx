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
    <div className={classNames('flex flex-col gap-2 h-full w-full', className)}>
      <div
        className={classNames(
          'flex flex-row items-center justify-between px-2 w-full h-16 bg-bolt-elements-background-depth-1 border-bolt-elements-borderColor'
        )}
        style={{ minHeight: '60px' }}
      >
        {themes.map(({ value, icon: Icon, label }) => {
          const isSelected = theme === value;
          return (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={classNames(
                'flex flex-1 items-center justify-center h-12 rounded-lg transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus focus:ring-offset-1',
                isSelected
                  ? 'bg-bolt-elements-background-depth-3 shadow-sm'
                  : 'bg-transparent hover:bg-bolt-elements-background-depth-2',
              )}
              style={{ minWidth: 0 }}
              title={label}
              aria-label={`Set theme to ${label}`}
            >
              <Icon
                size={26}
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

