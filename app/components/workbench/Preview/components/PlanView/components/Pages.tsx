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
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary rounded-lg border border-bolt-elements-borderColor hover:border-bolt-elements-borderColor/70 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 group
            "
          >
            {component.name}
            {feature?.status == AppFeatureStatus.ImplementationInProgress && (
              <div className="pl-2">
                <div
                  className={classNames(
                    'w-4 h-4 rounded-full border-2 border-bolt-elements-borderColor border-t-blue-500 animate-spin transition-transform duration-200 group-hover:scale-110',
                  )}
                />
              </div>
            )}
            {isFeatureStatusImplemented(feature?.status ?? AppFeatureStatus.NotStarted) && (
              <div className="text-green-500 text-sm font-medium whitespace-nowrap pl-2">
                <div className="i-ph:check-bold transition-transform duration-200 group-hover:scale-110" />
              </div>
            )}
          </span>
        </WithTooltip>
      </TooltipProvider>
    );
  };

  return (
    <div>
      <div className="space-y-4 mb-2">
        <div className="text-xl font-bold text-bolt-elements-textHeading mb-2">Page Layouts</div>

        {appSummary?.pages?.length === 0 ? (
          <div className="text-center py-8 bg-bolt-elements-background-depth-2/30 rounded-xl border border-bolt-elements-borderColor/50">
            <div className="text-4xl mb-3 opacity-50">📄</div>
            <div className="text-sm text-bolt-elements-textSecondary italic">No pages defined</div>
          </div>
        ) : (
          <div className="space-y-3">
            {appSummary?.pages?.map((page, index) => (
              <div
                key={index}
                className="bg-bolt-elements-background-depth-1 rounded-xl border border-bolt-elements-borderColor p-5 hover:border-bolt-elements-borderColor/70 transition-all duration-200 shadow-sm hover:shadow-lg hover:scale-[1.01] group"
              >
                {page.description && (
                  <div className="text-sm text-bolt-elements-textSecondary mb-3 leading-relaxed">
                    <div className="font-mono text-sm font-semibold text-bolt-elements-textHeading">
                      {page.description}
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full shadow-sm"></div>
                    <div className="font-mono text-sm font-semibold text-bolt-elements-textPrimary bg-bolt-elements-background-depth-2/50 px-2 py-1 rounded-md">
                      Path: {page.path}
                    </div>
                  </div>
                </div>

                {page.components && page.components.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-bolt-elements-textSecondary uppercase tracking-wider bg-bolt-elements-background-depth-2/30 px-2 py-1 rounded-md inline-block">
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
