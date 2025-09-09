import { useState, useMemo } from 'react';
import { classNames } from '~/utils/classNames';
import { themeRegistry } from './themes';

interface ThemeSwitcherProps {
  onThemeSwitch?: (themeName: string, themeData: any) => void;
  currentTheme?: string;
}

// Add custom theme to the imported theme registry
const themeRegistryWithCustom = {
  ...themeRegistry,
  custom: {
    name: 'Custom',
    title: 'Custom',
    description: 'Custom theme with manually edited variables.',
  },
};

// Use the imported theme registry (already in HSL format)

const themeKeys = Object.keys(themeRegistryWithCustom).filter((key) => key !== 'custom');

export const ThemeSwitcher = ({ onThemeSwitch, currentTheme }: ThemeSwitcherProps) => {
  const [selectedThemeIndex, setSelectedThemeIndex] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Get current theme key and data
  const currentThemeKey = themeKeys[selectedThemeIndex] || 'modern-minimal';
  const currentThemeData = themeRegistryWithCustom[currentThemeKey as keyof typeof themeRegistryWithCustom];

  // Display name (Custom if manual edits were made, otherwise theme name)
  const displayName = currentTheme === 'custom' ? 'Custom' : currentThemeData?.name || 'Select Theme';

  // Filter themes based on search term
  const filteredThemes = useMemo(() => {
    if (!searchTerm) {
      return themeKeys;
    }
    return themeKeys.filter((key) => {
      const theme = themeRegistryWithCustom[key as keyof typeof themeRegistryWithCustom];
      return (
        theme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        theme.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [searchTerm]);

  const applyTheme = (themeKey: string) => {
    const theme = themeRegistryWithCustom[themeKey as keyof typeof themeRegistryWithCustom];
    if (!theme) {
      return;
    }

    // Apply theme via theme injector and callback
    onThemeSwitch?.(themeKey, theme);
    setIsOpen(false);
  };

  const cycleTheme = (direction: 'prev' | 'next') => {
    let newIndex;
    if (direction === 'next') {
      newIndex = selectedThemeIndex + 1 >= themeKeys.length ? 0 : selectedThemeIndex + 1;
    } else {
      newIndex = selectedThemeIndex - 1 < 0 ? themeKeys.length - 1 : selectedThemeIndex - 1;
    }

    setSelectedThemeIndex(newIndex);
    const newThemeKey = themeKeys[newIndex];
    applyTheme(newThemeKey);
  };

  return (
    <div className="relative">
      {/* Arrow Navigation with Theme Name */}
      <div className="flex items-center justify-between w-full bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-md">
        {/* Left Arrow */}
        <button
          onClick={() => cycleTheme('prev')}
          className="p-2 bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 transition-colors rounded-l-md"
          title="Previous theme"
        >
          <svg
            className="w-4 h-4 text-bolt-elements-textSecondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Theme Name (clickable for dropdown) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 px-3 py-2 text-center text-sm font-medium text-bolt-elements-textPrimary bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 transition-colors"
          title="Click to select theme from list"
        >
          {displayName}
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => cycleTheme('next')}
          className="p-2 bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 transition-colors rounded-r-md"
          title="Next theme"
        >
          <svg
            className="w-4 h-4 text-bolt-elements-textSecondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Searchable Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor rounded-md shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-bolt-elements-borderColor">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-bolt-elements-textSecondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search themes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-md text-sm text-bolt-elements-textPrimary placeholder:text-bolt-elements-textSecondary focus:outline-none focus:ring-2 focus:ring-bolt-elements-borderColorActive focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Theme List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredThemes.length === 0 ? (
              <div className="px-3 py-4 text-sm text-bolt-elements-textSecondary text-center">No themes found</div>
            ) : (
              filteredThemes.map((key) => {
                const theme = themeRegistryWithCustom[key as keyof typeof themeRegistryWithCustom];
                const originalIndex = themeKeys.indexOf(key);
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedThemeIndex(originalIndex);
                      applyTheme(key);
                      setSearchTerm('');
                    }}
                    className={classNames(
                      'w-full px-3 py-3 text-left hover:bg-bolt-elements-background-depth-2 transition-colors',
                      'border-b border-bolt-elements-borderColor last:border-b-0',
                      selectedThemeIndex === originalIndex ? 'bg-bolt-elements-background-depth-2' : 'bg-bolt-elements-background-depth-1',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Color preview using light theme colors */}
                      {'light' in theme && theme.light && (
                        <div className="flex gap-1">
                          <div
                            className="w-4 h-4 rounded-sm border border-bolt-elements-borderColor"
                            style={{ backgroundColor: `hsl(${theme.light.primary})` }}
                          />
                          <div
                            className="w-4 h-4 rounded-sm border border-bolt-elements-borderColor"
                            style={{ backgroundColor: `hsl(${theme.light.secondary})` }}
                          />
                          <div
                            className="w-4 h-4 rounded-sm border border-bolt-elements-borderColor"
                            style={{ backgroundColor: `hsl(${theme.light.accent})` }}
                          />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-bolt-elements-textPrimary">{theme.name}</div>
                        <div className="text-xs text-bolt-elements-textSecondary">{theme.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Click overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            setSearchTerm('');
          }}
        />
      )}
    </div>
  );
};
