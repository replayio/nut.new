import { TweakCN } from '~/components/chat/Messages/components';
import { ChevronRight, ChevronLeft, ChevronDown } from '~/components/ui/Icon';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { PropControls } from './PropControls';
import { useState } from 'react';
import { getAvailableThemes } from '~/lib/replay/themeHelper';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { classNames } from '~/utils/classNames';

export const DesignSystemPanel = () => {
  const selectedElement = useStore(workbenchStore.selectedElement);
  const [selectedTheme, setSelectedTheme] = useState('modern-minimal');
  const [hoveredTheme, setHoveredTheme] = useState<string | null>(null);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const availableThemes = getAvailableThemes();

  const handlePropChange = (key: string, value: unknown) => {
    console.log('Prop changed:', key, value);

    // Get the iframe reference
    const iframe = document.querySelector('iframe');
    if (!iframe?.contentWindow) {
      console.warn('[DesignSystemPanel] No iframe found to send prop update');
      return;
    }

    // Send the prop update to the iframe with fiber ID for direct reference
    iframe.contentWindow.postMessage(
      {
        type: 'UPDATE_COMPONENT_PROPS',
        fiberId: (selectedElement as any)?.fiberId, // Use cached fiber ID if available
        componentSelector: selectedElement?.component?.selector,
        componentName: selectedElement?.component?.displayName || selectedElement?.component?.name,
        propKey: key,
        propValue: value,
        source: 'nut-design-panel',
      },
      '*',
    );
  };

  const handleBackToThemeEditor = () => {
    workbenchStore.setSelectedElement(null);
  };

  const handleComponentChange = (component: any, newTree: any[]) => {
    workbenchStore.setSelectedElement({
      component,
      tree: newTree,
      fiberId: (selectedElement as any)?.fiberId, // Preserve fiber ID
      domAttributes: (selectedElement as any)?.domAttributes, // Preserve DOM attributes
    });
  };

  const handleThemeChange = (themeName: string) => {
    setSelectedTheme(themeName);
    setHoveredTheme(null);
    setIsThemeDropdownOpen(false);
  };

  const handleThemeHover = (themeName: string) => {
    setHoveredTheme(themeName);
  };

  const handleThemeHoverEnd = () => {
    setHoveredTheme(null);
  };

  const handlePreviousTheme = () => {
    const currentIndex = availableThemes.findIndex((t) => t.name === selectedTheme);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : availableThemes.length - 1;
    handleThemeChange(availableThemes[previousIndex].name);
  };

  const handleNextTheme = () => {
    const currentIndex = availableThemes.findIndex((t) => t.name === selectedTheme);
    const nextIndex = currentIndex < availableThemes.length - 1 ? currentIndex + 1 : 0;
    handleThemeChange(availableThemes[nextIndex].name);
  };

  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <div className="bg-bolt-elements-background-depth-1 border-b border-bolt-elements-borderColor border-opacity-50 shadow-sm">
        <div className="flex items-center gap-2 px-4 py-1">
          {selectedElement ? (
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <button
                onClick={handleBackToThemeEditor}
                className="text-blue-500 hover:text-blue-600 font-medium text-base transition-colors"
              >
                App
              </button>
              <ChevronRight size={16} className="text-bolt-elements-textSecondary flex-shrink-0" />
              <span className="text-bolt-elements-textPrimary font-medium text-base truncate">
                {selectedElement.component?.displayName || selectedElement.component?.name || 'Component'}
              </span>
              {selectedElement.component?.type && (
                <>
                  <ChevronRight size={16} className="text-bolt-elements-textSecondary flex-shrink-0" />
                  <span className="text-bolt-elements-textSecondary text-sm truncate">
                    {selectedElement.component.type}
                  </span>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Theme Navigation - Left Side */}
              <div className="flex-1 text-bolt-elements-textSecondary text-sm font-medium truncate">Design System</div>

              {/* Theme Navigation - Right Side */}
              <div className="flex items-center gap-1">
                <DropdownMenu open={isThemeDropdownOpen} onOpenChange={setIsThemeDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 px-2 py-1 text-sm text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 rounded-md transition-colors">
                      <span className="truncate font-medium">
                        {availableThemes.find((t) => t.name === selectedTheme)?.title || 'Select Theme'}
                      </span>
                      <ChevronDown size={14} className="flex-shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto" onCloseAutoFocus={handleThemeHoverEnd}>
                    <DropdownMenuLabel>Available Themes</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableThemes.map((theme) => (
                      <DropdownMenuItem
                        key={theme.name}
                        onClick={() => handleThemeChange(theme.name)}
                        onMouseEnter={() => handleThemeHover(theme.name)}
                        onMouseLeave={handleThemeHoverEnd}
                        className={classNames({
                          'bg-accent': selectedTheme === theme.name,
                        })}
                      >
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{theme.title}</span>
                            {selectedTheme === theme.name && <span className="text-xs">✓</span>}
                          </div>
                          <span className="text-xs text-bolt-elements-textSecondary line-clamp-2">
                            {theme.description}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  onClick={handlePreviousTheme}
                  className="p-1 rounded-lg text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 transition-all duration-200 flex-shrink-0"
                  title="Previous theme"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={handleNextTheme}
                  className="p-1 rounded-lg text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2 transition-all duration-200 flex-shrink-0"
                  title="Next theme"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {selectedElement ? (
          <div className="space-y-4">
            {/* Component Info */}
            <div className="bg-bolt-elements-background-depth-2 rounded-lg p-4 border border-bolt-elements-borderColor">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-bolt-elements-textHeading">
                  {selectedElement.component?.displayName || selectedElement.component?.name || 'Component'}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary">
                  {selectedElement.component?.type}
                </span>
              </div>
              {selectedElement.component?.selector && (
                <p className="text-xs text-bolt-elements-textSecondary font-mono">
                  {selectedElement.component.selector}
                </p>
              )}
            </div>

            {/* Props Controls */}
            <div className="bg-bolt-elements-background-depth-2 rounded-lg p-4 border border-bolt-elements-borderColor">
              <PropControls
                props={selectedElement.component?.props || {}}
                domAttributes={(selectedElement as any)?.domAttributes}
                tree={selectedElement.tree}
                selectedComponent={selectedElement.component}
                onChange={handlePropChange}
                onComponentChange={handleComponentChange}
              />
            </div>

            {/* Children Components */}
            {selectedElement.children && selectedElement.children.length > 0 && (
              <div className="bg-bolt-elements-background-depth-2 rounded-lg p-4 border border-bolt-elements-borderColor">
                <h3 className="text-sm font-semibold text-bolt-elements-textHeading mb-3">
                  Children ({selectedElement.children.length})
                </h3>
                <div className="space-y-2">
                  {selectedElement.children.map((child, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-xs p-2 rounded bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor hover:bg-bolt-elements-background-depth-1 transition-colors cursor-pointer"
                    >
                      <span className="text-bolt-elements-textPrimary font-medium flex-1">
                        {child.displayName || child.name || 'Anonymous'}
                      </span>
                      <span className="text-bolt-elements-textSecondary text-xxs px-2 py-0.5 rounded-full bg-bolt-elements-background-depth-2">
                        {child.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <TweakCN selectedTheme={selectedTheme} hoveredTheme={hoveredTheme} onThemeChange={handleThemeChange} />
        )}
      </div>
    </div>
  );
};
