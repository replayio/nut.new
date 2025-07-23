import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';
import {
  type AppSummary,
  type AppDetail,
  AppFeatureStatus,
  isFeatureStatusImplemented,
} from '~/lib/persistence/messageAppSummary';
import { classNames } from '~/utils/classNames';

interface PagesProps {
  appSummary: AppSummary | null;
}

const Pages = ({ appSummary }: PagesProps) => {
  const renderComponent = (component: AppDetail, index: number) => {
    const feature = appSummary?.features?.find((feature) => feature.componentNames?.includes(component.name));

    return (
      <TooltipProvider key={index}>
        <WithTooltip tooltip={component.description}>
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 text-xs font-medium bg-bolt-elements-background-depth-1 text-bolt-elements-textSecondary rounded border border-bolt-elements-borderColor"
          >
            {component.name}
            {feature?.status == AppFeatureStatus.ImplementationInProgress && (
              <div
                className={classNames(
                  'w-4 h-4 rounded-full border-2 border-bolt-elements-borderColor border-t-blue-500 animate-spin',
                )}
              />
            )}
            {isFeatureStatusImplemented(feature?.status ?? AppFeatureStatus.NotStarted) && (
              <div className="text-green-500 text-sm font-medium whitespace-nowrap">✓</div>
            )}
          </span>
        </WithTooltip>
      </TooltipProvider>
    );
  };

  return (
    <div>
      <div className="space-y-4 mb-8">
        <div className="text-lg font-semibold text-bolt-elements-textPrimary">Page Layouts</div>

        {appSummary?.pages?.length === 0 ? (
          <div className="text-sm text-bolt-elements-textSecondary italic">No pages defined</div>
        ) : (
          <div className="space-y-3">
            {appSummary?.pages?.map((page, index) => (
              <div
                key={index}
                className="bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor p-4 hover:border-bolt-elements-borderColorHover transition-colors"
              >
                {page.description && (
                  <div className="text-sm text-bolt-elements-textSecondary mb-3 leading-relaxed">
                    <div className="font-mono text-sm font-semibold text-bolt-elements-textPrimary">
                      {page.description}
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <div className="font-mono text-sm font-semibold text-bolt-elements-textPrimary">
                      Endpoint Path: {page.path}
                    </div>
                  </div>
                </div>

                {page.components && page.components.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-bolt-elements-textTertiary uppercase tracking-wider">
                      Page Components
                    </div>
                    <div className="flex flex-wrap gap-1">{page.components.map(renderComponent)}</div>
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
