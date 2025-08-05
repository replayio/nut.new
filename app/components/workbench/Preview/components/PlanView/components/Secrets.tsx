import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';
import {
  type AppSummary,
  type AppDetail,
  AppFeatureStatus,
  isFeatureStatusImplemented,
} from '~/lib/persistence/messageAppSummary';
import { classNames } from '~/utils/classNames';

interface SecretsProps {
  appSummary: AppSummary;
}

// Secrets which values do not need to be provided for.
const BUILTIN_SECRET_NAMES = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];

const Secrets = ({ appSummary }: SecretsProps) => {
  const renderSecret = (secret: AppDetail, index: number) => {
    const isBuiltin = BUILTIN_SECRET_NAMES.includes(secret.name);
    
    return (
      <div
        key={index}
        className="p-3 border border-bolt-elements-borderColor rounded-lg bg-bolt-elements-background-depth-1"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-bolt-elements-textPrimary">
            {secret.name}
          </span>
          <span
            className={classNames(
              "px-2 py-1 text-xs font-medium rounded",
              isBuiltin
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-yellow-100 text-yellow-800 border border-yellow-200"
            )}
          >
            {isBuiltin ? "Built-in" : "Required"}
          </span>
        </div>
        
        {secret.description && (
          <p className="text-sm text-bolt-elements-textSecondary mb-2">
            {secret.description}
          </p>
        )}
        
        <div className={classNames(
          "text-xs p-2 rounded",
          isBuiltin
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-yellow-50 text-yellow-700 border border-yellow-200"
        )}>
          {isBuiltin ? (
            <span>✅ A value will be used automatically</span>
          ) : (
            <span>⚠️ This secret must be added before deployment</span>
          )}
        </div>
      </div>
    );
  }

  const secrets = appSummary?.features?.flatMap(f => f.secrets ?? []) ?? [];

  return (
    <div>
      <div className="space-y-4 mb-2">
        <div className="text-lg font-semibold text-bolt-elements-textPrimary">Secrets</div>
        <div className="space-y-3">
          {secrets.map(renderSecret)}
        </div>
      </div>
    </div>
  );
};

export default Secrets;
