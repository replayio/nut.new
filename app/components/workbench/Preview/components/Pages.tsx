import type { AppSummary } from '~/lib/persistence/messageAppSummary';

interface PagesProps {
  appSummary: AppSummary | null;
}

const Pages = ({ appSummary }: PagesProps) => {
  return (
    <div className="relative h-full p-6">
      <div className="space-y-4 mb-8">
        <div className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary">Page Layouts</div>

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
                    <div className="w-2 h-2 bg-bolt-elements-button-primary-background rounded-full"></div>
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
                    <div className="flex flex-wrap gap-1">
                      {page.components.map((component, componentIndex) => (
                        <span
                          key={componentIndex}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium bg-bolt-elements-background-depth-1 text-bolt-elements-textSecondary rounded border border-bolt-elements-borderColor"
                        >
                          {component.name}
                        </span>
                      ))}
                    </div>
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
