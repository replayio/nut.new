import { type AppFeature, type AppSummary } from '~/lib/persistence/messageAppSummary';

interface ComponentsProps {
  summary: AppSummary;
  feature: AppFeature;
}

function getComponentDescription(summary: AppSummary, componentName: string) {
  for (const page of summary.pages ?? []) {
    for (const component of page.components ?? []) {
      if (component.name === componentName) {
        return component.description;
      }
    }
  }
  return 'Unknown component';
}

const Components = ({ summary, feature }: ComponentsProps) => {
  return (
    <div className="border-t border-bolt-elements-borderColor">
      <div className="p-3">
        <div className="text-xs font-medium text-bolt-elements-textTertiary uppercase tracking-wider mb-3">
          Components ({feature?.componentNames?.length})
        </div>
        <div className="space-y-2">
          {feature?.componentNames?.map((name, idx) => (
            <div
              key={idx}
              className="bg-bolt-elements-background-depth-1 rounded-lg p-3 border border-bolt-elements-borderColor"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span className="font-mono text-sm font-semibold text-bolt-elements-textPrimary">{name}</span>
              </div>

              <div className="text-xs text-bolt-elements-textSecondary">{getComponentDescription(summary, name)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Components;
