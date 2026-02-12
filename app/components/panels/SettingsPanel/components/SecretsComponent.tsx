import React, { useEffect, useState } from 'react';
import { type AppSummary } from '~/lib/persistence/messageAppSummary';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { getAppSetSecrets } from '~/lib/replay/Secrets';
import { chatStore } from '~/lib/stores/chat';
import { secretsModalStore } from '~/lib/stores/secretsModal';
import { assert } from '~/utils/nut';
import { Button } from '~/components/ui/button';

interface SecretsComponentProps {
  appSummary: AppSummary;
}

const BUILTIN_SECRET_NAMES = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];

export const SecretsComponent: React.FC<SecretsComponentProps> = ({ appSummary }) => {
  const allSecrets = appSummary?.secrets ?? [];
  const [setSecrets, setSetSecrets] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const requiredSecrets = allSecrets.filter((secret) => !BUILTIN_SECRET_NAMES.includes(secret.name));
  const pendingSecrets = requiredSecrets.filter((secret) => !setSecrets.includes(secret.name));

  const appId = chatStore.currentAppId.get();
  assert(appId, 'App ID is required');

  useEffect(() => {
    const fetchSetSecrets = async () => {
      setIsLoaded(false);
      const appSetSecrets = await getAppSetSecrets(appId);
      setSetSecrets(appSetSecrets);
      setIsLoaded(true);
    };
    fetchSetSecrets();
  }, [appSummary, appId]);

  // Only show component if there are required secrets
  if (requiredSecrets.length === 0) {
    return null;
  }

  // Show loading state while fetching configured secrets
  if (!isLoaded) {
    return (
      <div className="p-4 border border-border rounded-md bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Secrets Configuration</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const allConfigured = pendingSecrets.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Secrets Configuration</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {allConfigured ? (
                <span className="flex items-center gap-1">
                  <CheckCircle size={12} className="text-muted-foreground" />
                  All {requiredSecrets.length} secret{requiredSecrets.length === 1 ? '' : 's'} configured
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertTriangle size={12} className="text-muted-foreground" />
                  {pendingSecrets.length} of {requiredSecrets.length} secret
                  {requiredSecrets.length === 1 ? '' : 's'} need{pendingSecrets.length === 1 ? 's' : ''} configuration
                </span>
              )}
            </p>
          </div>
        </div>

        <Button
          onClick={() => secretsModalStore.open()}
          variant={allConfigured ? 'outline' : 'default'}
          size="sm"
          className={`rounded-full ${!allConfigured ? 'bg-foreground text-background hover:bg-foreground/90' : ''}`}
        >
          {allConfigured ? 'Manage Keys' : 'Configure Keys'}
        </Button>
      </div>
    </div>
  );
};
