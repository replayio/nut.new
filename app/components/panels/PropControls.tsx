import React, { useState } from 'react';
import { Switch } from '~/components/ui/Switch';
import { classNames } from '~/utils/classNames';
import { getCurrentIFrame } from '~/components/workbench/Preview/Preview';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbEllipsis,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { buildBreadcrumbData } from '~/utils/componentBreadcrumb';

interface ReactComponent {
  displayName?: string;
  name?: string;
  props?: Record<string, unknown>;
  state?: unknown;
  type: 'class' | 'function' | 'host';
  selector?: string;
  source?: {
    fileName?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
}

interface PropControlsProps {
  props: Record<string, unknown>;
  domAttributes?: Record<string, unknown>;
  tree?: ReactComponent[];
  selectedComponent?: ReactComponent | null;
  onChange?: (key: string, value: unknown) => void;
  onComponentChange?: (component: ReactComponent, newTree: ReactComponent[]) => void;
}

export const PropControls: React.FC<PropControlsProps> = ({
  props,
  domAttributes,
  tree = [],
  selectedComponent,
  onChange,
  onComponentChange
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['attributes', 'props']));

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Helper functions for element highlighting
  const highlightElement = (component: ReactComponent) => {
    const iframe = getCurrentIFrame();
    if (!iframe || !iframe.contentWindow) {
      return;
    }

    const selector =
      component.selector ||
      (component.type === 'host' ? (component.displayName || component.name)?.toLowerCase() : null);
    const selectorParts = selector?.split('> ');
    if (selector) {
      iframe.contentWindow.postMessage(
        {
          type: 'ELEMENT_PICKER_HIGHLIGHT',
          selector: selectorParts?.[selectorParts.length - 1],
        },
        '*',
      );
    }
  };

  const clearHighlight = () => {
    const iframe = getCurrentIFrame();
    if (!iframe || !iframe.contentWindow) {
      return;
    }

    iframe.contentWindow.postMessage(
      {
        type: 'ELEMENT_PICKER_HIGHLIGHT',
        selector: null,
      },
      '*',
    );
  };

  // Helper function to update when clicking breadcrumb items
  const updateTreeToComponent = (clickedComponent: ReactComponent) => {
    if (!tree || !onComponentChange) {
      return;
    }

    const clickedIndex = tree.indexOf(clickedComponent);
    if (clickedIndex === -1) {
      return;
    }

    // Tree is ordered from deepest node to root, so trim everything below the clicked node
    const newTree = tree.slice(clickedIndex);
    const lastReactComponent = [...newTree]
      .reverse()
      .find((comp: ReactComponent) => comp.type === 'function' || comp.type === 'class');

    onComponentChange(lastReactComponent ?? clickedComponent, newTree);
  };

  const renderControl = (key: string, value: unknown) => {
    const type = typeof value;

    // Boolean control - switch
    if (type === 'boolean') {
      return (
        <div className="flex items-center justify-between" key={key}>
          <label className="text-xs text-bolt-elements-textSecondary">{key}</label>
          <Switch
            checked={value as boolean}
            onCheckedChange={(checked) => onChange?.(key, checked)}
          />
        </div>
      );
    }

    // Number control - slider or input
    if (type === 'number') {
      const numValue = value as number;
      const isInteger = Number.isInteger(numValue);
      const min = 0;
      const max = numValue > 100 ? numValue * 2 : 100;

      return (
        <div className="space-y-2" key={key}>
          <div className="flex items-center justify-between">
            <label className="text-xs text-bolt-elements-textSecondary">{key}</label>
            <input
              type="number"
              value={numValue}
              onChange={(e) => {
                const newValue = isInteger ? parseInt(e.target.value) : parseFloat(e.target.value);
                onChange?.(key, newValue);
              }}
              className="w-20 px-2 py-1 text-xs bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-md focus:outline-none focus:border-bolt-elements-borderColorActive focus:ring-1 focus:ring-bolt-elements-borderColorActive text-bolt-elements-textPrimary"
              step={isInteger ? 1 : 0.1}
            />
          </div>
          <input
            type="range"
            value={numValue}
            onChange={(e) => {
              const newValue = isInteger ? parseInt(e.target.value) : parseFloat(e.target.value);
              onChange?.(key, newValue);
            }}
            min={min}
            max={max}
            step={isInteger ? 1 : 0.1}
            className="w-full h-2 bg-bolt-elements-background-depth-3 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      );
    }

    // String control - text input or select for certain patterns
    if (type === 'string') {
      const strValue = value as string;

      // Check if it's a color (hex, rgb, hsl)
      if (strValue.match(/^#[0-9A-Fa-f]{6}$/) || strValue.match(/^rgb/) || strValue.match(/^hsl/)) {
        return (
          <div className="space-y-2" key={key}>
            <label className="text-xs text-bolt-elements-textSecondary">{key}</label>
            <div className="flex items-center gap-2">
              <div className="relative w-12 h-8 flex-shrink-0">
                <div
                  className="w-full h-full rounded border border-bolt-elements-borderColor cursor-pointer"
                  style={{ backgroundColor: strValue }}
                />
                <input
                  type="color"
                  value={strValue.startsWith('#') ? strValue : '#000000'}
                  onChange={(e) => onChange?.(key, e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <input
                type="text"
                value={strValue}
                onChange={(e) => onChange?.(key, e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-md focus:outline-none focus:border-bolt-elements-borderColorActive focus:ring-1 focus:ring-bolt-elements-borderColorActive text-bolt-elements-textPrimary"
              />
            </div>
          </div>
        );
      }

      // Regular text input
      return (
        <div className="space-y-2" key={key}>
          <label className="text-xs text-bolt-elements-textSecondary">{key}</label>
          <input
            type="text"
            value={strValue}
            onChange={(e) => onChange?.(key, e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-md focus:outline-none focus:border-bolt-elements-borderColorActive focus:ring-1 focus:ring-bolt-elements-borderColorActive text-bolt-elements-textPrimary"
          />
        </div>
      );
    }

    // Array, Object, or other types - show as JSON
    if (type === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return (
          <div className="space-y-2" key={key}>
            <label className="text-xs text-bolt-elements-textSecondary">{key}</label>
            <div className="bg-bolt-elements-background-depth-3 rounded-md p-2 border border-bolt-elements-borderColor">
              <pre className="text-xs text-bolt-elements-textSecondary overflow-x-auto">
                {JSON.stringify(value, null, 2)}
              </pre>
            </div>
          </div>
        );
      }

      // Regular object - render nested
      return (
        <div className="space-y-2" key={key}>
          <button
            onClick={() => toggleSection(key)}
            className="w-full flex items-center justify-between text-xs text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
          >
            <span>{key}</span>
            <span>{expandedSections.has(key) ? '−' : '+'}</span>
          </button>
          {expandedSections.has(key) && (
            <div className="pl-3 space-y-3 border-l-2 border-bolt-elements-borderColor">
              {Object.entries(value as Record<string, unknown>).map(([nestedKey, nestedValue]) =>
                renderControl(`${key}.${nestedKey}`, nestedValue),
              )}
            </div>
          )}
        </div>
      );
    }

    // Null, undefined, or function - show as read-only text
    return (
      <div className="space-y-2" key={key}>
        <label className="text-xs text-bolt-elements-textSecondary">{key}</label>
        <div className="px-3 py-1.5 text-xs bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-md text-bolt-elements-textSecondary">
          {String(value)}
        </div>
      </div>
    );
  };

  // Render breadcrumb navigation
  const renderBreadcrumb = () => {
    if (!tree || tree.length === 0) {
      return null;
    }

    const breadcrumbData = buildBreadcrumbData(tree, {
      getDisplayName: (comp) => comp.displayName || comp.name,
      getKind: (comp) => (comp.type === 'function' || comp.type === 'class' ? 'react' : 'html'),
    });

    if (!breadcrumbData) {
      return null;
    }

    const { htmlElements, lastReact, lastHtml } = breadcrumbData;
    const lastReactComponent = lastReact?.item as ReactComponent | undefined;
    const lastHtmlComponent = lastHtml?.item as ReactComponent | undefined;
    const lastReactDisplayName = lastReact?.displayName;

    return (
      <div className="mb-4 pb-3 border-b border-bolt-elements-borderColor">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <span className="text-xs text-bolt-elements-textSecondary">Editing:</span>
            </BreadcrumbItem>

            {/* Show parent React component */}
            {lastReactComponent && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage
                    className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                    onMouseEnter={() => highlightElement(lastReactComponent)}
                    onMouseLeave={clearHighlight}
                    onClick={() => updateTreeToComponent(lastReactComponent)}
                  >
                    {lastReactDisplayName?.split('$')[0] || lastReactDisplayName || 'Component'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}

            {/* Ellipsis for intermediate HTML elements */}
            {htmlElements.length > 1 && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded-lg p-1">
                      <BreadcrumbEllipsis className="h-4 w-4" />
                      <span className="sr-only">More HTML elements</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {htmlElements.slice(1, -1).map((node, index: number) => {
                        const component = node.item as ReactComponent;
                        return (
                          <DropdownMenuItem
                            key={index}
                            className="text-xs text-purple-600 dark:text-purple-400 cursor-pointer"
                            onMouseEnter={() => highlightElement(component)}
                            onMouseLeave={clearHighlight}
                            onClick={() => updateTreeToComponent(component)}
                          >
                            {node.displayName || component.name || 'unknown'}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </BreadcrumbItem>
              </>
            )}

            {/* Show currently selected HTML element */}
            {lastHtmlComponent && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage
                    className="text-xs text-purple-600 dark:text-purple-400 cursor-pointer hover:underline font-medium"
                    onMouseEnter={() => highlightElement(lastHtmlComponent)}
                    onMouseLeave={clearHighlight}
                    onClick={() => updateTreeToComponent(lastHtmlComponent)}
                  >
                    {lastHtml?.displayName || lastHtmlComponent.name || 'element'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      {renderBreadcrumb()}

      {/* DOM Attributes Section */}
      {domAttributes && Object.keys(domAttributes).length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => toggleSection('attributes')}
            className="flex items-center justify-between w-full"
          >
            <h3 className="text-sm font-semibold text-bolt-elements-textPrimary">DOM Attributes</h3>
            <span className="text-xs text-bolt-elements-textSecondary">
              {expandedSections.has('attributes') ? '−' : '+'}
            </span>
          </button>

          {expandedSections.has('attributes') && (
            <div className="space-y-3">
              {Object.entries(domAttributes).map(([key, value]) => renderControl(key, value))}
            </div>
          )}
        </div>
      )}

      {/* Props Section */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection('props')}
          className="flex items-center justify-between w-full"
        >
          <h3 className="text-sm font-semibold text-bolt-elements-textPrimary">React Props</h3>
          <span className="text-xs text-bolt-elements-textSecondary">
            {expandedSections.has('props') ? '−' : '+'}
          </span>
        </button>

        {expandedSections.has('props') && (
          <div className="space-y-3">
            {Object.keys(props).length > 0 ? (
              Object.entries(props).map(([key, value]) => renderControl(key, value))
            ) : (
              <p className="text-xs text-bolt-elements-textSecondary italic">No props available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
