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
    return (
      <span
        key={index}
        className="inline-flex items-center px-2 py-1 text-xs font-medium bg-bolt-elements-background-depth-1 text-bolt-elements-textSecondary rounded border border-bolt-elements-borderColor"
      >
        {secret.name}
      </span>
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
