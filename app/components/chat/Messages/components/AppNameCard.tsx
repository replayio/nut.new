import React, { useState, useEffect } from 'react';
import { AppCard } from './AppCard';
import { themeInjector } from '~/lib/replay/ThemeInjector';
import { markThemeChanged, themeChangesStore } from '~/lib/stores/themeChanges';
import { useStore } from '@nanostores/react';

export const AppNameCard: React.FC = () => {
  const [appName, setAppName] = useState('My App');
  const [originalAppName, setOriginalAppName] = useState('My App');
  const themeChanges = useStore(themeChangesStore);

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
      '--app-title': newName
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
          hasChanges: Object.keys(updatedChanges).length > 0 || Object.keys(currentStore.lightThemeChanges).length > 0 || Object.keys(currentStore.darkThemeChanges).length > 0
        });
      }
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
            <div className="text-xs text-bolt-elements-textSecondary mt-1">
              Type to update your app name
            </div>
          </div>
        </div>
      </div>
    </AppCard>
  );
};