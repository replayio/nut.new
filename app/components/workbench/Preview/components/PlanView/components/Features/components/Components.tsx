import { type AppFeature, type AppSummary } from '~/lib/persistence/messageAppSummary';
import { formatPascalCaseName } from '~/utils/names';

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
    <div className="border-t border-border">
      <div className="p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 bg-muted px-2 py-1 rounded-md inline-block">
          Components ({feature?.componentNames?.length})
        </div>
        <div className="space-y-3">
          {feature?.componentNames?.map((name, idx) => (
            <div
              key={idx}
              className="bg-card rounded-md p-4 border border-border hover:bg-accent/50 transition-colors duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 bg-foreground rounded-full"></div>
                <span className="font-mono text-sm font-semibold text-foreground">{formatPascalCaseName(name)}</span>
              </div>

              <div className="text-xs text-muted-foreground">{getComponentDescription(summary, name)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Components;
