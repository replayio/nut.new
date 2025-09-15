import React, { useState, useEffect } from 'react';
import { AppCard } from './AppCard';
import { themeInjector } from '~/lib/replay/ThemeInjector';
import { markThemeChanged, markThemesSaved, themeChangesStore } from '~/lib/stores/themeChanges';
import { useStore } from '@nanostores/react';
import { callNutAPI } from '~/lib/replay/NutAPI';
import { workbenchStore } from '~/lib/stores/workbench';

export const AppNameCard: React.FC = () => {
  const [appName, setAppName] = useState('My App');
  const [originalAppName, setOriginalAppName] = useState('My App');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const themeChanges = useStore(themeChangesStore);
  const repositoryId = useStore(workbenchStore.repositoryId);

  useEffect(() => {
    // Check if there's a pending change for app-title in appSettingsChanges
    const appTitleChange = themeChanges.appSettingsChanges?.['--app-title'];

    if (appTitleChange) {
      // Use the new value from pending changes
      setAppName(appTitleChange.newValue);
      setOriginalAppName(appTitleChange.oldValue);
    } else {
      // No pending changes, get from CSS variables
      const currentAppName = getComputedStyle(document.documentElement).getPropertyValue('--app-title') || 'My App';
      const cleanName = currentAppName.trim();
      setAppName(cleanName);
      setOriginalAppName(cleanName);
    }
  }, [themeChanges]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setAppName(newName);

    // Live update the CSS variable
    themeInjector.updateVariables({
      '--app-title': newName,
    });

    // Mark as changed if different from original
    if (newName !== originalAppName) {
      markThemeChanged('--app-title', originalAppName, newName, 'app-settings');
    } else {
      // If value matches original, remove from changes if it exists
      const currentStore = themeChangesStore.get();
      if (currentStore.appSettingsChanges?.['--app-title']) {
        const updatedChanges = { ...currentStore.appSettingsChanges };
        delete updatedChanges['--app-title'];
        themeChangesStore.set({
          ...currentStore,
          appSettingsChanges: updatedChanges,
          hasChanges:
            Object.keys(updatedChanges).length > 0 ||
            Object.keys(currentStore.lightThemeChanges).length > 0 ||
            Object.keys(currentStore.darkThemeChanges).length > 0,
        });
      }
    }
  };

  const handleSaveChanges = async () => {
    if (!repositoryId) {
      setSaveError('No app ID available');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Prepare the theme data in CSS format
      const allChanges = {
        appSettings: Object.entries(themeChanges.appSettingsChanges || {}).reduce(
          (acc, [key, change]) => {
            acc[key] = change.newValue;
            return acc;
          },
          {} as Record<string, string>,
        ),
        light: Object.entries(themeChanges.lightThemeChanges).reduce(
          (acc, [key, change]) => {
            acc[key] = change.newValue;
            return acc;
          },
          {} as Record<string, string>,
        ),
        dark: Object.entries(themeChanges.darkThemeChanges).reduce(
          (acc, [key, change]) => {
            acc[key] = change.newValue;
            return acc;
          },
          {} as Record<string, string>,
        ),
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
        appId: repositoryId,
        theme: themeCss,
      });

      // Mark as saved on success
      markThemesSaved();

      // Update the original app name to the saved value
      setOriginalAppName(appName);
    } catch (error) {
      console.error('Failed to save theme:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save theme');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppCard
      title="Application Name"
      description="Set the name that appears in your application"
      icon={<div className="i-ph:text-aa-duotone text-white text-lg" />}
      iconColor="blue"
      status="completed"
      progressText="Configured"
    >
      <div className="p-4 bg-bolt-elements-background-depth-2 rounded-xl border border-bolt-elements-borderColor">
        <div className="flex items-center gap-3">
          <div className="i-ph:text-aa-duotone text-bolt-elements-textPrimary" />
          <div className="flex-1">
            <input
              type="text"
              value={appName}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-md focus:outline-none focus:border-bolt-elements-borderColorActive focus:ring-1 focus:ring-bolt-elements-borderColorActive text-bolt-elements-textPrimary"
              placeholder="Enter app name..."
            />
            <div className="text-xs text-bolt-elements-textSecondary mt-1">Type to update your app name</div>
          </div>
        </div>

        {/* Save button and error message */}
        {themeChanges.hasChanges && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex-1">{saveError && <div className="text-xs text-red-500">{saveError}</div>}</div>
            <button
              onClick={handleSaveChanges}
              disabled={isSaving || !repositoryId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Theme'}
            </button>
          </div>
        )}
      </div>
    </AppCard>
  );
};
