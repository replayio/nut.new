import { type AppFeature } from '~/lib/persistence/messageAppSummary';

interface DefinedApisProps {
  feature: AppFeature;
}

const DefinedApis = ({ feature }: DefinedApisProps) => {
  return (
    <div className="border-t border-bolt-elements-borderColor">
      <div className="p-3">
        <div className="text-xs font-medium text-bolt-elements-textTertiary uppercase tracking-wider mb-3">
          Defined APIs ({feature?.definedAPIs?.length})
        </div>
        <div className="space-y-2">
          {feature?.definedAPIs?.map((api, apiIdx) => (
            <div
              key={apiIdx}
              className="bg-bolt-elements-background-depth-1 rounded-lg p-3 border border-bolt-elements-borderColor"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span className="font-mono text-sm font-semibold text-bolt-elements-textPrimary">{api.name}</span>
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                  {api.kind}
                </span>
              </div>

              {api.description && <div className="text-xs text-bolt-elements-textSecondary">{api.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DefinedApis;
