import { type AppFeature } from '~/lib/persistence/messageAppSummary';
import { formatPascalCaseName } from '~/utils/names';

interface DefinedApisProps {
  feature: AppFeature;
}

const DefinedApis = ({ feature }: DefinedApisProps) => {
  return (
    <div className="border-t border-border">
      <div className="p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 bg-muted px-2 py-1 rounded-md inline-block">
          Defined APIs ({feature?.definedAPIs?.length})
        </div>
        <div className="space-y-3">
          {feature?.definedAPIs?.map((api, apiIdx) => (
            <div
              key={apiIdx}
              className="bg-card rounded-md p-4 border border-border hover:bg-accent/50 transition-colors duration-200"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-2 bg-foreground rounded-full"></div>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {formatPascalCaseName(api.name)}
                </span>
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-md border border-border">
                  {api.kind}
                </span>
              </div>

              {api.description && <div className="text-xs text-muted-foreground">{api.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DefinedApis;
