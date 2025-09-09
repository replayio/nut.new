import { useState, useEffect } from 'react';
import { themeInjector } from '~/lib/replay/ThemeInjector';
import { classNames } from '~/utils/classNames';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/Accordion';

interface CSSVariable {
  id: string;
  name: string;
  value: string;
  category: string;
  label: string;
  type: 'color' | 'spacing' | 'radius' | 'font' | 'other';
  isEditing?: boolean;
}

// Global app settings - these persist across all theme changes
const appSettingsVariables: CSSVariable[] = [
  // App Settings
  { id: '0', name: '--app-title', value: 'My App', category: 'App Settings', label: 'App Title', type: 'other' },
  {
    id: '0.1',
    name: '--app-description',
    value: 'A modern web application',
    category: 'App Settings',
    label: 'App Description',
    type: 'other',
  },
  {
    id: '0.2',
    name: '--company-name',
    value: 'Your Company',
    category: 'App Settings',
    label: 'Company Name',
    type: 'other',
  },
  {
    id: '0.3',
    name: '--brand-logo-url',
    value: '/logo.png',
    category: 'App Settings',
    label: 'Brand Logo URL',
    type: 'other',
  },
  
  // Typography
  { id: '18', name: '--font-sans', value: 'Inter, sans-serif', category: 'Typography', label: 'Sans Serif Font', type: 'font' },
  { id: '19', name: '--font-serif', value: 'ui-serif, Georgia, serif', category: 'Typography', label: 'Serif Font', type: 'font' },
  { id: '20', name: '--font-mono', value: 'ui-monospace, monospace', category: 'Typography', label: 'Monospace Font', type: 'font' },
  
  // Font Weights  
  { id: '21', name: '--font-weight-normal', value: '400', category: 'Typography', label: 'Normal Weight', type: 'other' },
  { id: '22', name: '--font-weight-medium', value: '500', category: 'Typography', label: 'Medium Weight', type: 'other' },
  { id: '23', name: '--font-weight-semibold', value: '600', category: 'Typography', label: 'Semibold Weight', type: 'other' },
  { id: '24', name: '--font-weight-bold', value: '700', category: 'Typography', label: 'Bold Weight', type: 'other' },
  
  // Line Heights
  { id: '25', name: '--leading-tight', value: '1.25', category: 'Typography', label: 'Tight Line Height', type: 'other' },
  { id: '26', name: '--leading-normal', value: '1.5', category: 'Typography', label: 'Normal Line Height', type: 'other' },
  { id: '27', name: '--leading-relaxed', value: '1.625', category: 'Typography', label: 'Relaxed Line Height', type: 'other' },
  
  // Letter Spacing
  { id: '28', name: '--tracking-tighter', value: '-0.05em', category: 'Typography', label: 'Tighter Tracking', type: 'other' },
  { id: '29', name: '--tracking-tight', value: '-0.025em', category: 'Typography', label: 'Tight Tracking', type: 'other' },
  { id: '30', name: '--tracking-normal', value: '0em', category: 'Typography', label: 'Normal Tracking', type: 'other' },
  { id: '31', name: '--tracking-wide', value: '0.025em', category: 'Typography', label: 'Wide Tracking', type: 'other' },
  { id: '32', name: '--tracking-wider', value: '0.05em', category: 'Typography', label: 'Wider Tracking', type: 'other' },
  { id: '33', name: '--tracking-widest', value: '0.1em', category: 'Typography', label: 'Widest Tracking', type: 'other' },
  { id: '39', name: '--letter-spacing', value: '0em', category: 'Typography', label: 'Letter Spacing', type: 'other' },
  
  // Layout
  { id: '34', name: '--radius', value: '0.5rem', category: 'Layout', label: 'Border Radius', type: 'radius' },
  { id: '35', name: '--spacing', value: '0.25rem', category: 'Layout', label: 'Base Spacing', type: 'spacing' },
  { id: '36', name: '--border-width', value: '1px', category: 'Layout', label: 'Border Width', type: 'other' },
  
  // Shadows
  { id: '37', name: '--shadow-color', value: '0 0% 0%', category: 'Shadows', label: 'Shadow Color', type: 'other' },
  { id: '38', name: '--shadow-opacity', value: '0.1', category: 'Shadows', label: 'Shadow Opacity', type: 'other' },
];

export const AppSettings = () => {
  const [appSettings, setAppSettings] = useState<CSSVariable[]>([...appSettingsVariables]);
  const [defaultOpenCategories] = useState<string[]>(['App Settings', 'Typography', 'Layout']);
  const [searchTerm, setSearchTerm] = useState('');

  // Group variables by category
  const filteredVariables = appSettings.filter((variable) => {
    if (!searchTerm) {
      return true;
    }
    return (
      variable.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variable.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const groupedVariables = filteredVariables.reduce(
    (acc, variable) => {
      if (!acc[variable.category]) {
        acc[variable.category] = [];
      }
      acc[variable.category].push(variable);
      return acc;
    },
    {} as Record<string, CSSVariable[]>,
  );

  // Apply app settings to iframe
  const applyAppSettings = () => {
    const variableObject = appSettings.reduce(
      (acc, v) => {
        acc[v.name] = v.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    themeInjector.updateVariables(variableObject);
  };

  // Update a single variable by ID
  const updateVariable = (id: string, updates: Partial<CSSVariable>) => {
    setAppSettings((prev) => {
      const updated = prev.map((v) => {
        if (v.id === id) {
          const newVar = { ...v, ...updates };
          // Apply app settings changes immediately
          if (updates.value && updates.value !== v.value) {
            const singleVarUpdate = { [newVar.name]: updates.value };
            themeInjector.updateVariables(singleVarUpdate);
          }
          return newVar;
        }
        return v;
      });
      return updated;
    });
  };

  // Add a new app setting variable
  const addVariable = () => {
    const newId = Date.now().toString();
    const newVariable: CSSVariable = {
      id: newId,
      name: '--new-app-setting',
      value: 'New Value',
      category: 'App Settings',
      label: 'New App Setting',
      type: 'other',
      isEditing: true,
    };
    setAppSettings((prev) => [...prev, newVariable]);
  };

  // Delete a variable
  const deleteVariable = (id: string) => {
    setAppSettings((prev) => prev.filter((v) => v.id !== id));
  };

  // Start editing variable name
  const startEditingName = (id: string) => {
    setAppSettings((prev) => prev.map((v) => (v.id === id ? { ...v, isEditing: true } : v)));
  };

  // Stop editing variable name
  const stopEditingName = (id: string) => {
    setAppSettings((prev) => prev.map((v) => (v.id === id ? { ...v, isEditing: false } : v)));
  };

  // Apply changes immediately when app settings change
  useEffect(() => {
    applyAppSettings();
  }, [appSettings]);

  return (
    <div className="flex flex-col h-full bg-bolt-elements-background-depth-1">
      {/* Header */}
      <div className="border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-1 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-bolt-elements-textPrimary">App Settings</h2>
        </div>

        <div className="text-xs text-bolt-elements-textSecondary">
          Configure application-specific settings that persist across all theme changes
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search app settings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-md focus:outline-none focus:border-bolt-elements-borderColorActive"
        />
      </div>

      {/* Variables List */}
      <div className="flex-1 overflow-y-auto">
        <Accordion type="multiple" defaultValue={defaultOpenCategories}>
          {Object.entries(groupedVariables).map(([category, categoryVariables]) => {
            if (categoryVariables.length === 0) {
              return null;
            }

            return (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger>
                  <span className="text-sm font-semibold text-bolt-elements-textPrimary">
                    {category}
                    <span className="ml-2 px-2 py-0.5 text-xs bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary rounded">
                      {categoryVariables.length} {categoryVariables.length === 1 ? 'setting' : 'settings'}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-4 py-2 space-y-3">
                    {categoryVariables.map((variable) => (
                      <div
                        key={variable.id}
                        className="flex items-center justify-between p-3 bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 rounded-md transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-bolt-elements-textPrimary">{variable.label}</label>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="text"
                              value={variable.value}
                              onChange={(e) => updateVariable(variable.id, { value: e.target.value })}
                              className="flex-1 px-3 py-2 text-sm bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-md focus:outline-none focus:border-bolt-elements-borderColorActive focus:ring-1 focus:ring-bolt-elements-borderColorActive text-bolt-elements-textPrimary"
                              placeholder="Enter value..."
                            />
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
                                className="text-xs text-bolt-elements-textSecondary font-mono cursor-pointer hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-4 px-2 py-1 rounded-md transition-colors"
                                onClick={() => startEditingName(variable.id)}
                                title="Click to edit variable name"
                              >
                                {variable.name}
                              </code>
                            )}
                          </div>
                        </div>
                        {/* Delete button for custom variables */}
                        {!appSettingsVariables.some((dv) => dv.name === variable.name) && (
                          <button
                            onClick={() => deleteVariable(variable.id)}
                            className="ml-2 p-2 text-bolt-elements-icon-error hover:bg-bolt-elements-icon-error/10 rounded-md transition-colors"
                            title="Delete app setting"
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
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
};
