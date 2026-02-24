import { memo } from 'react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '~/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { buildBreadcrumbData } from '~/utils/componentBreadcrumb';
import { workbenchStore } from '~/lib/stores/workbench';
import { getCurrentIFrame } from '~/components/workbench/Preview/iframeRef';

interface ReactComponent {
  displayName?: string;
  name?: string;
  props?: Record<string, unknown>;
  state?: unknown;
  type: 'class' | 'function' | 'host';
  selector?: string;
}

interface SelectedElement {
  component: ReactComponent | null;
  tree: ReactComponent[];
}

interface ComponentBreadcrumbProps {
  selectedElement: SelectedElement | null;
}

export const ComponentBreadcrumb = memo(({ selectedElement }: ComponentBreadcrumbProps) => {
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

  const updateTreeToComponent = (clickedComponent: ReactComponent, tree: ReactComponent[]) => {
    const clickedIndex = tree.indexOf(clickedComponent);
    if (clickedIndex === -1) {
      return;
    }

    const newTree = tree.slice(clickedIndex);
    const lastReactComponent = [...newTree]
      .reverse()
      .find((comp: ReactComponent) => comp.type === 'function' || comp.type === 'class');

    workbenchStore.setSelectedElement({
      component: lastReactComponent ?? clickedComponent,
      tree: newTree,
    });
  };

  if (!selectedElement || (!selectedElement.tree?.length && !selectedElement.component)) {
    return null;
  }

  if (!selectedElement?.tree || selectedElement.tree.length === 0) {
    return (
      <div className="bg-card border-t border-border px-4 py-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{selectedElement?.component?.displayName || 'Selection'}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    );
  }

  const originalTree = selectedElement.tree as ReactComponent[];
  const breadcrumb = buildBreadcrumbData(originalTree, {
    getDisplayName: (comp) => comp.displayName || comp.name,
    getKind: (comp) => (comp.type === 'function' || comp.type === 'class' ? 'react' : 'html'),
  });

  if (!breadcrumb) {
    return null;
  }

  const { htmlElements, firstReact, lastReact, lastHtml } = breadcrumb;
  const lastReactComponent = lastReact?.item as ReactComponent | undefined;
  const firstReactComponent = firstReact?.item as ReactComponent | undefined;
  const lastHtmlComponent = lastHtml?.item as ReactComponent | undefined;
  const lastReactDisplayName = lastReact?.displayName;
  const firstReactDisplayName = firstReact?.displayName;

  return (
    <div className="bg-card border-t border-border px-4 py-2">
      <Breadcrumb>
        <BreadcrumbList>
          {lastReactComponent && firstReactComponent && lastReactDisplayName !== firstReactDisplayName && (
            <BreadcrumbItem>
              <BreadcrumbLink
                className="cursor-pointer"
                onMouseEnter={() => highlightElement(lastReactComponent)}
                onMouseLeave={clearHighlight}
                onClick={() => updateTreeToComponent(lastReactComponent, originalTree)}
              >
                {lastReactDisplayName?.split('$')[0] || lastReactDisplayName || lastReactComponent.name || 'Component'}
              </BreadcrumbLink>
            </BreadcrumbItem>
          )}

          {htmlElements.length > 1 && (
            <>
              {lastReactComponent && firstReactComponent && lastReactDisplayName !== firstReactDisplayName && (
                <BreadcrumbSeparator />
              )}
              <BreadcrumbItem>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                    <BreadcrumbEllipsis />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {htmlElements.slice(1, -1).map((node, index: number) => {
                      const component = node.item as ReactComponent;
                      return (
                        <DropdownMenuItem
                          key={index}
                          className="cursor-pointer"
                          onMouseEnter={() => highlightElement(component)}
                          onMouseLeave={clearHighlight}
                          onClick={() => updateTreeToComponent(component, originalTree)}
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

          {lastHtmlComponent && (
            <>
              {(htmlElements.length > 1 ||
                (lastReactComponent && firstReactComponent && lastReactDisplayName !== firstReactDisplayName)) && (
                <BreadcrumbSeparator />
              )}
              <BreadcrumbItem>
                <BreadcrumbLink
                  className="cursor-pointer"
                  onMouseEnter={() => highlightElement(lastHtmlComponent)}
                  onMouseLeave={clearHighlight}
                  onClick={() => updateTreeToComponent(lastHtmlComponent, originalTree)}
                >
                  {lastHtml?.displayName || lastHtmlComponent.name || 'element'}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}

          {firstReactComponent && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage
                  className="cursor-default"
                  onMouseEnter={() => highlightElement(firstReactComponent)}
                  onMouseLeave={clearHighlight}
                >
                  {firstReactDisplayName?.split('$')[0] ||
                    firstReactDisplayName ||
                    firstReactComponent.name ||
                    'Component'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
});

ComponentBreadcrumb.displayName = 'ComponentBreadcrumb';
