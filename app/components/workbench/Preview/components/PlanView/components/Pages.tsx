import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';
import { type AppDetail, AppFeatureStatus, isFeatureStatusImplemented } from '~/lib/persistence/messageAppSummary';
import { classNames } from '~/utils/classNames';
import { formatPascalCaseName } from '~/utils/names';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { assert } from '~/utils/nut';
import { Check } from '~/components/ui/Icon';

const Pages = () => {
  const appSummary = useStore(chatStore.appSummary);
  assert(appSummary, 'App summary is required');

  const renderComponent = (component: AppDetail, index: number) => {
    const feature = appSummary?.features?.find((feature) => feature.componentNames?.includes(component.name));

    return (
      <TooltipProvider key={index}>
        <WithTooltip tooltip={component.description}>
          <span
            key={index}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-card text-muted-foreground hover:text-foreground rounded-md border border-border transition-colors group"
          >
            {formatPascalCaseName(component.name)}
            {feature?.status == AppFeatureStatus.ImplementationInProgress && (
              <div className="pl-2">
                <div
                  className={classNames(
                    'w-4 h-4 rounded-full border-2 border-muted-foreground border-t-foreground animate-spin',
                  )}
                />
              </div>
            )}
            {isFeatureStatusImplemented(feature?.status ?? AppFeatureStatus.NotStarted) && (
              <div className="text-foreground text-sm font-medium whitespace-nowrap pl-2">
                <Check size={14} strokeWidth={2.5} />
              </div>
            )}
          </span>
        </WithTooltip>
      </TooltipProvider>
    );
  };

  return (
    <div>
      <div className="space-y-4">
        {appSummary?.pages?.length === 0 ? (
          <div className="text-center py-8 bg-muted rounded-md border border-border">
            <div className="text-4xl mb-3 opacity-50">📄</div>
            <div className="text-sm text-muted-foreground italic">No pages defined</div>
          </div>
        ) : (
          <div className="space-y-3">
            {appSummary?.pages?.map((page, index) => (
              <div
                key={index}
                className="bg-card rounded-md border border-border p-5 hover:bg-accent/50 transition-colors group"
              >
                <div className="gap-2 min-w-0 flex-1">
                  <div className="text-foreground text-base font-bold">
                    {formatPascalCaseName(page.name ?? '')}
                  </div>
                  <div className="flex items-center group text-muted-foreground min-w-0">
                    <span>{page.description ?? ''}</span>
                  </div>
                </div>

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-foreground rounded-full"></div>
                    <div className="font-mono text-sm font-semibold text-foreground bg-muted px-2 py-1 rounded-md">
                      Path: {page.path}
                    </div>
                  </div>
                </div>

                {page.components && page.components.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted px-2 py-1 rounded-md inline-block">
                      Page Components
                    </div>
                    <div className="flex flex-wrap gap-2">{page.components.map(renderComponent)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pages;
