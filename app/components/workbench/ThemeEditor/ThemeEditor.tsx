import { useState, useEffect } from 'react';
import { themeInjector } from '~/lib/replay/ThemeInjector';
import { getCustomVariables } from '~/lib/replay/MessageHandler';
import { markThemeChanged, resetThemeChanges } from '~/lib/stores/themeChanges';
import { ColorPicker } from './ColorPicker';
import { ThemeSwitcher } from './ThemeSwitcher';
import { classNames } from '~/utils/classNames';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/Accordion';

interface CSSVariable {
  id: string; // Unique identifier for tracking edits
  name: string;
  value: string;
  category: string;
  label: string;
  type: 'color' | 'spacing' | 'radius' | 'font' | 'other';
  isEditing?: boolean; // Track if name is being edited
}

const lightThemeVariables: CSSVariable[] = [
  // Primary Colors
  { id: '1', name: '--primary', value: '221 83% 53%', category: 'Primary Colors', label: 'Primary', type: 'color' },
  {
    id: '2',
    name: '--primary-foreground',
    value: '0 0% 98%',
    category: 'Primary Colors',
    label: 'Primary Foreground',
    type: 'color',
  },

  // Secondary Colors
  {
    id: '3',
    name: '--secondary',
    value: '0 0% 96.1%',
    category: 'Secondary Colors',
    label: 'Secondary',
    type: 'color',
  },
  {
    id: '4',
    name: '--secondary-foreground',
    value: '0 0% 9%',
    category: 'Secondary Colors',
    label: 'Secondary Foreground',
    type: 'color',
  },

  // Base Colors
  { id: '5', name: '--background', value: '0 0% 100%', category: 'Base Colors', label: 'Background', type: 'color' },
  { id: '6', name: '--foreground', value: '0 0% 3.9%', category: 'Base Colors', label: 'Foreground', type: 'color' },
  { id: '7', name: '--border', value: '0 0% 89.8%', category: 'Base Colors', label: 'Border', type: 'color' },
  { id: '8', name: '--input', value: '0 0% 89.8%', category: 'Base Colors', label: 'Input', type: 'color' },
  { id: '9', name: '--ring', value: '0 0% 3.9%', category: 'Base Colors', label: 'Ring', type: 'color' },

  // Card Colors
  { id: '10', name: '--card', value: '0 0% 100%', category: 'Card Colors', label: 'Card', type: 'color' },
  {
    id: '11',
    name: '--card-foreground',
    value: '0 0% 3.9%',
    category: 'Card Colors',
    label: 'Card Foreground',
    type: 'color',
  },

  // Accent Colors
  { id: '12', name: '--accent', value: '0 0% 96.1%', category: 'Accent Colors', label: 'Accent', type: 'color' },
  {
    id: '13',
    name: '--accent-foreground',
    value: '0 0% 9%',
    category: 'Accent Colors',
    label: 'Accent Foreground',
    type: 'color',
  },

  // Muted Colors
  { id: '14', name: '--muted', value: '0 0% 96.1%', category: 'Muted Colors', label: 'Muted', type: 'color' },
  {
    id: '15',
    name: '--muted-foreground',
    value: '0 0% 45.1%',
    category: 'Muted Colors',
    label: 'Muted Foreground',
    type: 'color',
  },

  // Destructive Colors
  {
    id: '16',
    name: '--destructive',
    value: '0 84.2% 60.2%',
    category: 'Destructive Colors',
    label: 'Destructive',
    type: 'color',
  },
  {
    id: '17',
    name: '--destructive-foreground',
    value: '0 0% 98%',
    category: 'Destructive Colors',
    label: 'Destructive Foreground',
    type: 'color',
  },
];

const darkThemeVariables: CSSVariable[] = [
  // Primary Colors
  { id: '21', name: '--primary', value: '217 91% 60%', category: 'Primary Colors', label: 'Primary', type: 'color' },
  {
    id: '22',
    name: '--primary-foreground',
    value: '0 0% 98%',
    category: 'Primary Colors',
    label: 'Primary Foreground',
    type: 'color',
  },

  // Secondary Colors
  {
    id: '23',
    name: '--secondary',
    value: '0 0% 14.9%',
    category: 'Secondary Colors',
    label: 'Secondary',
    type: 'color',
  },
  {
    id: '24',
    name: '--secondary-foreground',
    value: '0 0% 98%',
    category: 'Secondary Colors',
    label: 'Secondary Foreground',
    type: 'color',
  },

  // Base Colors
  { id: '25', name: '--background', value: '0 0% 3.9%', category: 'Base Colors', label: 'Background', type: 'color' },
  { id: '26', name: '--foreground', value: '0 0% 98%', category: 'Base Colors', label: 'Foreground', type: 'color' },
  { id: '27', name: '--border', value: '0 0% 26.9%', category: 'Base Colors', label: 'Border', type: 'color' },
  { id: '28', name: '--input', value: '0 0% 26.9%', category: 'Base Colors', label: 'Input', type: 'color' },
  { id: '29', name: '--ring', value: '0 0% 83.1%', category: 'Base Colors', label: 'Ring', type: 'color' },

  // Card Colors
  { id: '30', name: '--card', value: '0 0% 12%', category: 'Card Colors', label: 'Card', type: 'color' },
  {
    id: '31',
    name: '--card-foreground',
    value: '0 0% 98%',
    category: 'Card Colors',
    label: 'Card Foreground',
    type: 'color',
  },

  // Accent Colors
  { id: '32', name: '--accent', value: '0 0% 14.9%', category: 'Accent Colors', label: 'Accent', type: 'color' },
  {
    id: '33',
    name: '--accent-foreground',
    value: '0 0% 98%',
    category: 'Accent Colors',
    label: 'Accent Foreground',
    type: 'color',
  },

  // Muted Colors
  { id: '34', name: '--muted', value: '0 0% 14.9%', category: 'Muted Colors', label: 'Muted', type: 'color' },
  {
    id: '35',
    name: '--muted-foreground',
    value: '0 0% 63.9%',
    category: 'Muted Colors',
    label: 'Muted Foreground',
    type: 'color',
  },

  // Destructive Colors
  {
    id: '36',
    name: '--destructive',
    value: '0 62.8% 30.6%',
    category: 'Destructive Colors',
    label: 'Destructive',
    type: 'color',
  },
  {
    id: '37',
    name: '--destructive-foreground',
    value: '0 0% 98%',
    category: 'Destructive Colors',
    label: 'Destructive Foreground',
    type: 'color',
  },
];

// App Settings Variables (Typography, Layout, etc.)
const appSettingsVariables: CSSVariable[] = [
  
  // Typography
  { id: 'typo1', name: '--font-sans', value: 'Inter, sans-serif', category: 'Typography', label: 'Sans Serif Font', type: 'font' },
  { id: 'typo2', name: '--font-serif', value: 'ui-serif, Georgia, serif', category: 'Typography', label: 'Serif Font', type: 'font' },
  { id: 'typo3', name: '--font-mono', value: 'ui-monospace, monospace', category: 'Typography', label: 'Monospace Font', type: 'font' },
  
  // Font Weights  
  { id: 'typo4', name: '--font-weight-normal', value: '400', category: 'Typography', label: 'Normal Weight', type: 'other' },
  { id: 'typo5', name: '--font-weight-medium', value: '500', category: 'Typography', label: 'Medium Weight', type: 'other' },
  { id: 'typo6', name: '--font-weight-semibold', value: '600', category: 'Typography', label: 'Semibold Weight', type: 'other' },
  { id: 'typo7', name: '--font-weight-bold', value: '700', category: 'Typography', label: 'Bold Weight', type: 'other' },
  
  // Line Heights
  { id: 'typo8', name: '--leading-tight', value: '1.25', category: 'Typography', label: 'Tight Line Height', type: 'other' },
  { id: 'typo9', name: '--leading-normal', value: '1.5', category: 'Typography', label: 'Normal Line Height', type: 'other' },
  { id: 'typo10', name: '--leading-relaxed', value: '1.625', category: 'Typography', label: 'Relaxed Line Height', type: 'other' },
  
  // Letter Spacing
  { id: 'typo11', name: '--tracking-tighter', value: '-0.05em', category: 'Typography', label: 'Tighter Tracking', type: 'other' },
  { id: 'typo12', name: '--tracking-tight', value: '-0.025em', category: 'Typography', label: 'Tight Tracking', type: 'other' },
  { id: 'typo13', name: '--tracking-normal', value: '0em', category: 'Typography', label: 'Normal Tracking', type: 'other' },
  { id: 'typo14', name: '--tracking-wide', value: '0.025em', category: 'Typography', label: 'Wide Tracking', type: 'other' },
  { id: 'typo15', name: '--tracking-wider', value: '0.05em', category: 'Typography', label: 'Wider Tracking', type: 'other' },
  { id: 'typo16', name: '--tracking-widest', value: '0.1em', category: 'Typography', label: 'Widest Tracking', type: 'other' },
  { id: 'typo17', name: '--letter-spacing', value: '0em', category: 'Typography', label: 'Letter Spacing', type: 'other' },
  
  // Layout
  { id: 'layout1', name: '--radius', value: '0.5rem', category: 'Layout', label: 'Border Radius', type: 'radius' },
  { id: 'layout2', name: '--spacing', value: '0.25rem', category: 'Layout', label: 'Base Spacing', type: 'spacing' },
  { id: 'layout3', name: '--border-width', value: '1px', category: 'Layout', label: 'Border Width', type: 'other' },
  
  // Shadows
  { id: 'shadow1', name: '--shadow-color', value: '0 0% 0%', category: 'Shadows', label: 'Shadow Color', type: 'other' },
  { id: 'shadow2', name: '--shadow-opacity', value: '0.1', category: 'Shadows', label: 'Shadow Opacity', type: 'other' },
];

// Create the original base colors from the default theme variables
const createOriginalBaseColors = () => {
  const baseColors: Record<string, string> = {};
  
  // Add light theme defaults (colors only)
  lightThemeVariables.forEach((variable) => {
    if (variable.type === 'color') {
      baseColors[variable.name] = variable.value;
    }
  });
  
  // Add dark theme defaults (colors only, with -dark suffix)
  darkThemeVariables.forEach((variable) => {
    if (variable.type === 'color') {
      baseColors[`${variable.name}-dark`] = variable.value;
    }
  });
  
  return baseColors;
};

export const ThemeEditor = () => {
  const [lightVariables, setLightVariables] = useState<CSSVariable[]>([...lightThemeVariables, ...appSettingsVariables]);
  const [darkVariables, setDarkVariables] = useState<CSSVariable[]>([...darkThemeVariables, ...appSettingsVariables]);
  const [liveVariables, setLiveVariables] = useState<Record<string, string>>({});
  // Store the original base colors from the default theme editor values
  const [originalBaseColors] = useState<Record<string, string>>(createOriginalBaseColors());
  const [defaultOpenCategories] = useState<string[]>(['Primary Colors', 'Base Colors', 'Live Variables', 'App Settings', 'Typography', 'Layout']);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPresetTheme, setCurrentPresetTheme] = useState<string>('');
  const [isCustomTheme, setIsCustomTheme] = useState(false);

  // Get current theme variables
  const variables = isDarkMode ? darkVariables : lightVariables;
  const setVariables = isDarkMode ? setDarkVariables : setLightVariables;

  // Fetch live variables from iframe
  const fetchLiveVariables = async () => {
    const iframe = document.querySelector('iframe[title="preview"]') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      try {
        const liveVars = await getCustomVariables(iframe);
        setLiveVariables(liveVars);
      } catch (error) {
        console.error('Failed to fetch live variables:', error);
      }
    }
  };

  // Create live variables as CSSVariable objects
  const liveVariablesAsCSS: CSSVariable[] = Object.entries(liveVariables).map(([name, value]) => ({
    id: `live-${name}`,
    name,
    value: String(value),
    category: 'Live Variables',
    label: name
      .replace(/^--/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase()),
    type:
      typeof value === 'string' && (value.includes('%') || value.includes('hsl') || value.includes('rgb'))
        ? ('color' as const)
        : ('other' as const),
  }));

  // Group variables by category, including live variables - separate color and non-color variables
  const allVariables = [...variables, ...liveVariablesAsCSS];
  const filteredVariables = allVariables;

  // Separate variables into color and non-color categories
  const colorVariables = filteredVariables.filter(variable => variable.type === 'color');
  const nonColorVariables = filteredVariables.filter(variable => variable.type !== 'color');

  // Group color variables by category for the theme colors section
  const groupedColorVariables = colorVariables.reduce(
    (acc, variable) => {
      if (!acc[variable.category]) {
        acc[variable.category] = [];
      }
      if (
        !searchTerm ||
        variable.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        variable.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        acc[variable.category].push(variable);
      }
      return acc;
    },
    {} as Record<string, CSSVariable[]>,
  );

  // Group non-color variables - put them all in a single "Settings" category for the top table
  const groupedNonColorVariables = nonColorVariables.reduce(
    (acc, variable) => {
      const category = 'Settings'; // All non-color variables go in Settings category
      if (!acc[category]) {
        acc[category] = [];
      }
      if (
        !searchTerm ||
        variable.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        variable.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        acc[category].push(variable);
      }
      return acc;
    },
    {} as Record<string, CSSVariable[]>,
  );

  // Fetch live variables periodically
  useEffect(() => {
    fetchLiveVariables();
    const interval = setInterval(fetchLiveVariables, 2000); // Every 2 seconds
    return () => clearInterval(interval);
  }, []);

  // Apply theme variables to iframe
  const applyVariables = () => {
    const variableObject = variables.reduce(
      (acc, v) => {
        acc[v.name] = v.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    themeInjector.updateVariables(variableObject);
  };

  // Apply a preset theme to theme variables only (app settings are preserved)
  const applyPresetTheme = (themeName: string, themeData: any) => {
    if (!themeData.light || !themeData.dark) {
      return;
    }

    setCurrentPresetTheme(themeName);
    setIsCustomTheme(false);

    // First, detect all changes between ORIGINAL BASE colors and new preset
    // This will show in the banner what's changing from the editor's default state
    resetThemeChanges();

    // Compare light theme against original base colors
    Object.entries(themeData.light).forEach(([key, newValue]) => {
      const varName = `--${key}`;
      const originalValue = originalBaseColors[varName];
      if (originalValue && originalValue !== newValue) {
        markThemeChanged(varName, originalValue, newValue as string, false);
      }
    });

    // Compare dark theme against original base colors
    Object.entries(themeData.dark).forEach(([key, newValue]) => {
      const varName = `--${key}`;
      const originalValue = originalBaseColors[`${varName}-dark`];
      
      if (originalValue && originalValue !== newValue) {
        markThemeChanged(varName, originalValue, newValue as string, true);
      }
    });

    // Create new variable arrays with theme values (colors and app settings)
    const updateVariablesWithTheme = (baseVars: CSSVariable[], themeValues: Record<string, string>) => {
      return baseVars.map((variable) => {
        // Map variable name to theme property
        const themeKey = variable.name.replace('--', '');
        if (themeValues[themeKey]) {
          return { ...variable, value: themeValues[themeKey] };
        }

        return variable;
      });
    };

    // Update both light and dark theme variables
    const newLightVariables = updateVariablesWithTheme([...lightThemeVariables, ...appSettingsVariables], themeData.light);
    const newDarkVariables = updateVariablesWithTheme([...darkThemeVariables, ...appSettingsVariables], themeData.dark);

    setLightVariables(newLightVariables);
    setDarkVariables(newDarkVariables);

    // Apply the current theme mode to iframe
    const currentThemeColors = isDarkMode ? themeData.dark : themeData.light;
    const cssVariables = Object.entries(currentThemeColors).reduce(
      (acc, [key, value]) => {
        acc[`--${key}`] = value as string;
        return acc;
      },
      {} as Record<string, string>,
    );

    themeInjector.updateVariables(cssVariables);
  };

  // Update a single variable by ID
  const updateVariable = (id: string, updates: Partial<CSSVariable>) => {
    // Mark as custom theme when making manual edits to theme variables
    const isManualEdit = updates.value && !id.startsWith('live-');
    if (isManualEdit && currentPresetTheme) {
      const variable = [...lightVariables, ...darkVariables].find((v) => v.id === id);
      if (variable) {
        setIsCustomTheme(true);
      }
    }

    if (id.startsWith('live-')) {
      // Handle live variables - update them through the iframe
      const variableName = id.replace('live-', '');
      if (updates.value) {
        const singleVarUpdate = { [variableName]: updates.value };
        themeInjector.updateVariables(singleVarUpdate);
        // Update local state immediately for UI feedback
        setLiveVariables((prev) => ({ ...prev, [variableName]: updates.value || '' }));
        // Track the change against original base colors
        const originalKey = isDarkMode ? `${variableName}-dark` : variableName;
        const originalValue = originalBaseColors[originalKey] || '';
        if (originalValue && originalValue !== updates.value) {
          markThemeChanged(variableName, originalValue, updates.value, isDarkMode);
        }
      }
    } else {
      // Handle theme variables
      setVariables((prev) => {
        const updated = prev.map((v) => {
          if (v.id === id) {
            const newVar = { ...v, ...updates };
            // Track the change against original base colors
            if (updates.value && updates.value !== v.value) {
              // This is a color variable in theme editor
              const originalKey = isDarkMode ? `${newVar.name}-dark` : newVar.name;
              const originalValue = originalBaseColors[originalKey] || v.value;
              if (originalValue !== updates.value) {
                markThemeChanged(newVar.name, originalValue, updates.value, isDarkMode);
              }
            }
            return newVar;
          }
          return v;
        });
        return updated;
      });
    }
  };

  // Add a new variable
  const addVariable = () => {
    const newId = Date.now().toString();
    const newVariable: CSSVariable = {
      id: newId,
      name: '--new-variable',
      value: '0 0% 50%',
      category: 'Custom',
      label: 'New Variable',
      type: 'color',
      isEditing: true,
    };
    setVariables((prev) => [...prev, newVariable]);
  };

  // Delete a variable
  const deleteVariable = (id: string) => {
    setVariables((prev) => prev.filter((v) => v.id !== id));
  };

  // Start editing variable name
  const startEditingName = (id: string) => {
    setVariables((prev) => prev.map((v) => (v.id === id ? { ...v, isEditing: true } : v)));
  };

  // Stop editing variable name
  const stopEditingName = (id: string) => {
    setVariables((prev) => prev.map((v) => (v.id === id ? { ...v, isEditing: false } : v)));
  };

  // Apply changes immediately when variables change
  useEffect(() => {
    applyVariables();
  }, [variables]);

  // Listen for global theme reset events
  useEffect(() => {
    const handleThemeReset = () => {
      if (isDarkMode) {
        setDarkVariables([...darkThemeVariables, ...appSettingsVariables]);
      } else {
        setLightVariables([...lightThemeVariables, ...appSettingsVariables]);
      }
      // Reset theme state
      setCurrentPresetTheme('');
      setIsCustomTheme(false);
      // Apply the reset theme to iframe
      handleThemeSwitch(isDarkMode);
    };

    window.addEventListener('theme-reset-requested', handleThemeReset);

    return () => {
      window.removeEventListener('theme-reset-requested', handleThemeReset);
    };
  }, [isDarkMode]);

  // Switch theme
  const handleThemeSwitch = (dark: boolean) => {
    setIsDarkMode(dark);

    // Apply the appropriate theme to the iframe
    if (dark) {
      // Apply current dark theme variables
      const currentDarkVars = isDarkMode ? darkVariables : [...darkThemeVariables, ...appSettingsVariables];
      const variableObject = currentDarkVars.reduce(
        (acc, v) => {
          acc[v.name] = v.value;
          return acc;
        },
        {} as Record<string, string>,
      );
      themeInjector.updateVariables(variableObject);
    } else {
      // Apply current light theme variables
      const currentLightVars = !isDarkMode ? lightVariables : [...lightThemeVariables, ...appSettingsVariables];
      const variableObject = currentLightVars.reduce(
        (acc, v) => {
          acc[v.name] = v.value;
          return acc;
        },
        {} as Record<string, string>,
      );
      themeInjector.updateVariables(variableObject);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bolt-elements-background">
      {/* Header */}
      <div className="border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 p-4 space-y-3">

        {/* Theme Switcher */}
        <div className="space-y-2">
          <ThemeSwitcher
            currentTheme={isCustomTheme ? 'custom' : currentPresetTheme}
            onThemeSwitch={applyPresetTheme}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLiveVariables}
              className="px-3 py-1.5 text-xs bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary rounded hover:bg-bolt-elements-background-depth-3 transition-colors"
              title="Refresh live variables"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              onClick={() => handleThemeSwitch(false)}
              className={classNames(
                'px-3 py-1.5 text-xs rounded transition-colors',
                !isDarkMode
                  ? 'bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text'
                  : 'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3',
              )}
            >
              Light
            </button>
            <button
              onClick={() => handleThemeSwitch(true)}
              className={classNames(
                'px-3 py-1.5 text-xs rounded transition-colors',
                isDarkMode
                  ? 'bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text'
                  : 'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3',
              )}
            >
              Dark
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search variables..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-md focus:outline-none focus:border-bolt-elements-borderColorActive"
        />
      </div>

      {/* Variables List */}
      <div className="flex-1 overflow-y-auto">
        <Accordion type="multiple" defaultValue={[...defaultOpenCategories, 'Settings']}>
          {/* Settings Section (Non-Color Variables) */}
          {Object.entries(groupedNonColorVariables).map(([category, categoryVariables]) => {
            if (categoryVariables.length === 0) {
              return null;
            }

            return (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger>
                  <span className="text-sm font-semibold text-bolt-elements-textPrimary">
                    {category}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-4 py-2 space-y-3">
                    {categoryVariables.map((variable) => (
                      <div
                        key={variable.id}
                        className={classNames(
                          'flex items-center justify-between p-3 rounded-md transition-colors',
                          variable.category === 'Live Variables' 
                            ? 'bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor' 
                            : 'bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3',
                        )}
                      >
                        <div className="flex flex-col gap-3 w-full">
                          {/* Variable Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-bolt-elements-textPrimary">
                                {variable.label}
                              </span>
                              {variable.category === 'Live Variables' && (
                                <span className="px-2 py-0.5 text-xs bg-bolt-elements-button-primary-background/20 text-bolt-elements-button-primary-background rounded-full">
                                  Live
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Variable Controls */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={variable.value}
                                onChange={(e) => updateVariable(variable.id, { value: e.target.value })}
                                className="w-full px-3 py-2 text-sm bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-md focus:outline-none focus:border-bolt-elements-borderColorActive focus:ring-1 focus:ring-bolt-elements-borderColorActive"
                                placeholder="Enter value..."
                              />
                            </div>

                            {/* Variable Name Display/Edit */}
                            <div className="min-w-0 flex-shrink-0">
                              {variable.isEditing ? (
                                <input
                                  type="text"
                                  value={variable.name}
                                  onChange={(e) => updateVariable(variable.id, { name: e.target.value })}
                                  onBlur={() => stopEditingName(variable.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      stopEditingName(variable.id);
                                    }
                                  }}
                                  className="text-xs font-mono px-2 py-1 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColorActive rounded-md focus:outline-none w-32"
                                  autoFocus
                                />
                              ) : (
                                <code
                                  className="text-xs text-bolt-elements-textSecondary font-mono cursor-pointer hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 px-2 py-1 rounded-md transition-colors"
                                  onClick={() => startEditingName(variable.id)}
                                  title="Click to edit variable name"
                                >
                                  {variable.name}
                                </code>
                              )}
                            </div>
                          </div>
                          {/* Delete button for custom variables */}
                          {![...lightThemeVariables, ...darkThemeVariables, ...appSettingsVariables].some(
                            (dv) => dv.name === variable.name,
                          ) &&
                            !variable.id.startsWith('live-') && (
                              <button
                                onClick={() => deleteVariable(variable.id)}
                                className="ml-2 p-2 text-bolt-elements-icon-error hover:bg-bolt-elements-icon-error/10 rounded-md transition-colors"
                                title="Delete variable"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
          
          {/* Theme Colors Section (Color Variables) */}
          {Object.entries(groupedColorVariables).map(([category, categoryVariables]) => {
            if (categoryVariables.length === 0) {
              return null;
            }

            return (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger>
                  <span className="text-sm font-semibold text-bolt-elements-textPrimary">
                    {category}
                    {category === 'Live Variables' && categoryVariables.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text rounded-full">
                        {categoryVariables.length} active
                      </span>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-4 py-2 space-y-3">
                    {categoryVariables.map((variable) => (
                      <div
                        key={variable.id}
                        className={classNames(
                          'flex items-center justify-between p-3 rounded-md transition-colors',
                          variable.category === 'Live Variables' 
                            ? 'bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor' 
                            : 'bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3',
                        )}
                      >
                        <div className="flex flex-col gap-3 w-full">
                          {/* Variable Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-bolt-elements-textPrimary">
                                {variable.label}
                              </span>
                              {variable.category === 'Live Variables' && (
                                <span className="px-2 py-0.5 text-xs bg-bolt-elements-button-primary-background/20 text-bolt-elements-button-primary-background rounded-full">
                                  Live
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Variable Controls */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              {variable.type === 'color' ? (
                                <ColorPicker
                                  value={variable.value}
                                  onChange={(value) => updateVariable(variable.id, { value })}
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={variable.value}
                                  onChange={(e) => updateVariable(variable.id, { value: e.target.value })}
                                  className="w-full px-3 py-2 text-sm bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-md focus:outline-none focus:border-bolt-elements-borderColorActive focus:ring-1 focus:ring-bolt-elements-borderColorActive"
                                  placeholder="Enter value..."
                                />
                              )}
                            </div>

                            {/* Variable Name Display/Edit */}
                            <div className="min-w-0 flex-shrink-0">
                              {variable.isEditing ? (
                                <input
                                  type="text"
                                  value={variable.name}
                                  onChange={(e) => updateVariable(variable.id, { name: e.target.value })}
                                  onBlur={() => stopEditingName(variable.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      stopEditingName(variable.id);
                                    }
                                  }}
                                  className="text-xs font-mono px-2 py-1 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColorActive rounded-md focus:outline-none w-32"
                                  autoFocus
                                />
                              ) : (
                                <code
                                  className="text-xs text-bolt-elements-textSecondary font-mono cursor-pointer hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 px-2 py-1 rounded-md transition-colors"
                                  onClick={() => startEditingName(variable.id)}
                                  title="Click to edit variable name"
                                >
                                  {variable.name}
                                </code>
                              )}
                            </div>
                          </div>
                          {/* Delete button for custom variables */}
                          {![...lightThemeVariables, ...darkThemeVariables, ...appSettingsVariables].some((dv) => dv.name === variable.name) &&
                            !variable.id.startsWith('live-') && (
                              <button
                                onClick={() => deleteVariable(variable.id)}
                                className="ml-2 p-2 text-bolt-elements-icon-error hover:bg-bolt-elements-icon-error/10 rounded-md transition-colors"
                                title="Delete variable"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={addVariable}
              className="px-4 py-2 text-sm bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text rounded-md hover:bg-bolt-elements-button-primary-backgroundHover transition-colors font-medium"
            >
              + Add Variable
            </button>
            <button
              onClick={() => {
                if (isDarkMode) {
                  setDarkVariables([...darkThemeVariables, ...appSettingsVariables]);
                } else {
                  setLightVariables([...lightThemeVariables, ...appSettingsVariables]);
                }
                // Reset theme state
                setCurrentPresetTheme('');
                setIsCustomTheme(false);
                resetThemeChanges();
                // Apply the reset theme to iframe
                handleThemeSwitch(isDarkMode);
              }}
              className="px-4 py-2 text-sm bg-bolt-elements-button-secondary-background text-bolt-elements-button-secondary-text rounded-md hover:bg-bolt-elements-button-secondary-backgroundHover transition-colors font-medium"
            >
              Reset to Default
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const variableObject = variables.reduce(
                  (acc, v) => {
                    acc[v.name] = v.value;
                    return acc;
                  },
                  {} as Record<string, string>,
                );

                const json = JSON.stringify(variableObject, null, 2);
                navigator.clipboard.writeText(json);
              }}
              className="px-4 py-2 text-sm bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary rounded-md hover:bg-bolt-elements-background-depth-3 transition-colors font-medium"
            >
              Copy JSON
            </button>

            <button
              onClick={applyVariables}
              className="px-4 py-2 text-sm bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text rounded-md hover:bg-bolt-elements-button-primary-backgroundHover transition-colors font-medium"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
