import { useStore } from '@nanostores/react';
import { themeChangesStore, markThemesSaved, triggerThemeReset, type ThemeChange } from '~/lib/stores/themeChanges';
import { classNames } from '~/utils/classNames';
import { callNutAPI } from '~/lib/replay/NutAPI';
import { chatStore } from '~/lib/stores/chat';
import { useState } from 'react';

// Component to render a color swatch for HSL values
const ColorSwatch = ({ hslValue }: { hslValue: string }) => {
  return (
    <div 
      className="inline-block w-4 h-4 rounded border border-gray-300 dark:border-gray-600 align-middle"
      style={{ backgroundColor: `hsl(${hslValue})` }}
      title={hslValue}
    />
  );
};

export const ThemeChangesBanner = () => {
  const themeChanges = useStore(themeChangesStore);
  const appId = useStore(chatStore.currentAppId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!themeChanges.hasChanges) {
    return null;
  }

  const handleSaveChanges = async () => {
    if (!appId) {
      setSaveError('No app ID available');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Prepare the theme data in CSS format
      const allChanges = {
        appSettings: Object.entries(themeChanges.appSettingsChanges || {}).reduce((acc, [key, change]) => {
          acc[key] = change.newValue;
          return acc;
        }, {} as Record<string, string>),
        light: Object.entries(themeChanges.lightThemeChanges).reduce((acc, [key, change]) => {
          acc[key] = change.newValue;
          return acc;
        }, {} as Record<string, string>),
        dark: Object.entries(themeChanges.darkThemeChanges).reduce((acc, [key, change]) => {
          acc[key] = change.newValue;
          return acc;
        }, {} as Record<string, string>),
      };

      // Convert to CSS format for the backend
      const generateCssFromChanges = (changes: typeof allChanges) => {
        let css = ':root {\n';
        
        // Add app settings (these go in :root)
        Object.entries(changes.appSettings).forEach(([key, value]) => {
          css += `  ${key}: ${value};\n`;
        });
        
        // Add light theme colors
        Object.entries(changes.light).forEach(([key, value]) => {
          css += `  ${key}: ${value};\n`;
        });
        
        css += '}\n\n.dark {\n';
        
        // Add dark theme colors
        Object.entries(changes.dark).forEach(([key, value]) => {
          css += `  ${key}: ${value};\n`;
        });
        
        css += '}\n';
        return css;
      };

      const themeCss = generateCssFromChanges(allChanges);

      // Call the set-app-theme API
      await callNutAPI('set-app-theme', {
        appId,
        theme: themeCss,
      });

      // Mark as saved on success
      markThemesSaved();
      
      // Also copy to clipboard for reference
      const changesJson = JSON.stringify(allChanges, null, 2);
      navigator.clipboard.writeText(changesJson).then(() => {
        console.log('Theme changes copied to clipboard');
      });

    } catch (error) {
      console.error('Failed to save theme:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save theme');
    } finally {
      setIsSaving(false);
    }
  };

  const lightChangedCount = Object.keys(themeChanges.lightThemeChanges).length;
  const darkChangedCount = Object.keys(themeChanges.darkThemeChanges).length;
  const appSettingsCount = Object.keys(themeChanges.appSettingsChanges || {}).length;
  const totalChangedCount = lightChangedCount + darkChangedCount + appSettingsCount;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-amber-600 dark:text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span className="text-sm text-amber-800 dark:text-amber-200">
            Theme changes made locally ({totalChangedCount} variable{totalChangedCount !== 1 ? 's' : ''} modified
            {lightChangedCount > 0 && darkChangedCount > 0
              ? ` - ${lightChangedCount} light, ${darkChangedCount} dark`
              : lightChangedCount > 0
                ? ' - light theme'
                : ' - dark theme'}
            )
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className={classNames(
              'px-3 py-1 text-xs rounded transition-colors',
              'bg-amber-600 hover:bg-amber-700 text-white',
              'dark:bg-amber-500 dark:hover:bg-amber-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={triggerThemeReset}
            disabled={isSaving}
            className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 px-2 py-1 disabled:opacity-50"
          >
            Reset to Default
          </button>
        </div>
      </div>

      {/* Show error if save failed */}
      {saveError && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-red-800 dark:text-red-200">Error saving theme: {saveError}</span>
          </div>
        </div>
      )}

      {/* Show changed variables in tables */}
      <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
        <details className="cursor-pointer">
          <summary className="hover:text-amber-900 dark:hover:text-amber-100">View changed variables</summary>
          <div className="mt-2 space-y-4">
            {/* App Settings Table */}
            {appSettingsCount > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">App Settings</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-amber-300 dark:border-amber-700">
                        <th className="text-left px-2 py-1 text-amber-700 dark:text-amber-300">Setting</th>
                        <th className="text-left px-2 py-1 text-amber-700 dark:text-amber-300">Old Value</th>
                        <th className="text-left px-2 py-1 text-amber-700 dark:text-amber-300">New Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(themeChanges.appSettingsChanges || {}).sort().map(([settingName, change]) => (
                        <tr key={settingName} className="border-b border-amber-200 dark:border-amber-800">
                          <td className="px-2 py-1 text-amber-600 dark:text-amber-400">
                            {settingName}
                          </td>
                          <td className="px-2 py-1 text-gray-600 dark:text-gray-400">
                            {change.oldValue}
                          </td>
                          <td className="px-2 py-1 text-amber-600 dark:text-amber-400">
                            {change.newValue}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Theme Colors Table */}
            {(lightChangedCount > 0 || darkChangedCount > 0) && (
              <div>
                <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">Theme Colors</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-amber-300 dark:border-amber-700">
                  <th className="text-left px-2 py-1 text-amber-700 dark:text-amber-300">Variable</th>
                  <th className="text-left px-2 py-1 text-amber-700 dark:text-amber-300">Light Mode</th>
                  <th className="text-left px-2 py-1 text-amber-700 dark:text-amber-300">Dark Mode</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Get all unique variable names from both light and dark changes
                  const allVariableNames = new Set([
                    ...Object.keys(themeChanges.lightThemeChanges),
                    ...Object.keys(themeChanges.darkThemeChanges),
                  ]);
                  
                  return Array.from(allVariableNames).sort().map((varName) => {
                    const lightChange = themeChanges.lightThemeChanges[varName];
                    const darkChange = themeChanges.darkThemeChanges[varName];
                    
                    return (
                      <tr key={varName} className="border-b border-amber-200 dark:border-amber-800">
                        {/* Variable Name */}
                        <td className="px-2 py-1 text-amber-600 dark:text-amber-400">
                          {varName}
                        </td>
                        
                        {/* Light Mode Changes */}
                        <td className="px-2 py-1">
                          {lightChange ? (
                            <div className="flex items-center gap-1">
                              <ColorSwatch hslValue={lightChange.oldValue} />
                              <span className="text-amber-500">→</span>
                              <ColorSwatch hslValue={lightChange.newValue} />
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600 italic">no change</span>
                          )}
                        </td>
                        
                        {/* Dark Mode Changes */}
                        <td className="px-2 py-1">
                          {darkChange ? (
                            <div className="flex items-center gap-1">
                              <ColorSwatch hslValue={darkChange.oldValue} />
                              <span className="text-amber-500">→</span>
                              <ColorSwatch hslValue={darkChange.newValue} />
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600 italic">no change</span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
                </div>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
};
