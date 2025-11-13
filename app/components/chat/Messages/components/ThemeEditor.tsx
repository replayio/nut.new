import { useState } from 'react';
import { ChevronRight } from '~/components/ui/Icon';
import { cn } from '~/lib/utils';

interface ThemeEditorProps {
  selectedTheme?: string;
  onThemeChange?: (vars: Record<string, string>) => void;
}

export const ThemeEditor: React.FC<ThemeEditorProps> = ({ selectedTheme, onThemeChange }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('fonts');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Theme sections configuration
  const sections = [
    {
      id: 'fonts',
      title: 'Fonts',
      icon: <span className="text-base">Aa</span>,
      controls: [
        {
          label: 'Sans Serif',
          value: 'Inter',
          type: 'select',
          options: ['Inter', 'Geist', 'System UI', 'Arial', 'Helvetica'],
        },
      ],
    },
    {
      id: 'colors',
      title: 'Colors',
      icon: <span className="text-base">🎨</span>,
      preview: (
        <div className="flex gap-1">
          <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="w-6 h-6 rounded bg-gray-400 dark:bg-gray-600" />
          <div className="w-6 h-6 rounded bg-white dark:bg-gray-900" />
          <div className="w-6 h-6 rounded bg-blue-500" />
          <div className="w-6 h-6 rounded bg-blue-600" />
        </div>
      ),
      controls: [
        {
          label: 'Primary',
          sublabel: 'Primary',
          value: 'hsl(38, 92%, 50%)',
          type: 'color-group',
          colors: [
            { label: 'Primary', cssVar: 'primary', value: 'hsl(38, 92%, 50%)' },
            { label: 'Primary Foreground', cssVar: 'primary-foreground', value: 'hsl(0, 0%, 0%)' },
          ],
        },
        {
          label: 'Secondary',
          sublabel: 'Secondary',
          value: 'hsl(220, 14%, 96%)',
          type: 'color-group',
          colors: [
            { label: 'Secondary', cssVar: 'secondary', value: 'hsl(220, 14%, 96%)' },
            { label: 'Secondary Foreground', cssVar: 'secondary-foreground', value: 'hsl(215, 14%, 34%)' },
          ],
        },
        {
          label: 'Accent',
          sublabel: 'Accent',
          value: 'hsl(48, 100%, 96%)',
          type: 'color-group',
          colors: [
            { label: 'Accent', cssVar: 'accent', value: 'hsl(48, 100%, 96%)' },
            { label: 'Accent Foreground', cssVar: 'accent-foreground', value: 'hsl(23, 83%, 31%)' },
          ],
        },
        {
          label: 'Base',
          sublabel: 'Background',
          value: 'hsl(0, 0%, 100%)',
          type: 'color-group',
          colors: [
            { label: 'Background', cssVar: 'background', value: 'hsl(0, 0%, 100%)' },
            { label: 'Foreground', cssVar: 'foreground', value: 'hsl(0, 0%, 15%)' },
          ],
        },
        {
          label: 'Card',
          sublabel: 'Card',
          value: 'hsl(0, 0%, 100%)',
          type: 'color-group',
          colors: [
            { label: 'Card', cssVar: 'card', value: 'hsl(0, 0%, 100%)' },
            { label: 'Card Foreground', cssVar: 'card-foreground', value: 'hsl(0, 0%, 15%)' },
          ],
        },
      ],
    },
    {
      id: 'radius',
      title: 'Radius',
      icon: <span className="text-base">⬜</span>,
      preview: <span className="text-xs text-bolt-elements-textSecondary">0.625</span>,
      controls: [
        {
          label: 'Border Radius',
          value: 0.625,
          type: 'slider',
          min: 0,
          max: 2,
          step: 0.125,
        },
      ],
    },
    {
      id: 'shadows',
      title: 'Shadows',
      icon: <span className="text-base">💎</span>,
      controls: [
        {
          label: 'Shadow Size',
          value: 'medium',
          type: 'button-group',
          options: [
            { label: 'Small', value: 'small' },
            { label: 'Medium', value: 'medium' },
            { label: 'Large', value: 'large' },
            { label: 'None', value: 'none' },
            { label: 'Glow', value: 'glow' },
            { label: 'Solid', value: 'solid' },
          ],
        },
      ],
    },
  ];

  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <div
          key={section.id}
          className="bg-bolt-elements-background-depth-2 rounded-xl border border-bolt-elements-borderColor overflow-hidden"
        >
          {/* Section Header */}
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-bolt-elements-background-depth-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-bolt-elements-background-depth-3 flex items-center justify-center">
                {section.icon}
              </div>
              <span className="text-sm font-semibold text-bolt-elements-textPrimary">{section.title}</span>
            </div>
            <div className="flex items-center gap-2">
              {section.preview && <div>{section.preview}</div>}
              <ChevronRight
                size={18}
                className={cn(
                  'text-bolt-elements-textSecondary transition-transform',
                  expandedSection === section.id && 'rotate-90',
                )}
              />
            </div>
          </button>

          {/* Section Content */}
          {expandedSection === section.id && (
            <div className="p-4 pt-0 space-y-4 border-t border-bolt-elements-borderColor">
              {section.controls.map((control, index) => (
                <div key={index}>
                  {control.type === 'select' && (
                    <div>
                      <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
                        {control.label}
                      </label>
                      <select
                        value={control.value}
                        className="w-full px-3 py-2 bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg text-bolt-elements-textPrimary"
                      >
                        {control.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {control.type === 'color-group' && (
                    <div>
                      <div className="text-sm font-medium text-bolt-elements-textPrimary mb-3">{control.label}</div>
                      <div className="space-y-2">
                        {control.colors?.map((color) => (
                          <div key={color.cssVar} className="flex items-center gap-2">
                            <input
                              type="color"
                              value={color.value}
                              className="w-12 h-8 rounded border border-bolt-elements-borderColor cursor-pointer"
                            />
                            <span className="text-sm text-bolt-elements-textSecondary flex-1">{color.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {control.type === 'slider' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-bolt-elements-textPrimary">{control.label}</label>
                        <span className="text-sm font-mono text-bolt-elements-textSecondary">{control.value}</span>
                      </div>
                      <div className="relative">
                        <input
                          type="range"
                          min={control.min}
                          max={control.max}
                          step={control.step}
                          value={control.value}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}

                  {control.type === 'button-group' && (
                    <div>
                      <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-3">
                        {control.label}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {control.options?.map((option) => (
                          <button
                            key={option.value}
                            className={cn(
                              'px-3 py-6 rounded-lg border text-sm font-medium transition-colors',
                              control.value === option.value
                                ? 'bg-bolt-elements-background-depth-4 border-bolt-elements-focus text-bolt-elements-textPrimary'
                                : 'bg-bolt-elements-background-depth-3 border-bolt-elements-borderColor text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-4',
                            )}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-10 h-10 rounded border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2" />
                              <span>{option.label}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
