import { useStore } from '@nanostores/react';
import { secretsModalStore } from '~/lib/stores/secretsModal';
import { chatStore } from '~/lib/stores/chat';
import { X, Key } from 'lucide-react';
import { Button } from '~/components/ui/button';
import Secrets from '~/components/workbench/Preview/components/PlanView/components/Secrets';

export function GlobalSecretsModal() {
  const isOpen = useStore(secretsModalStore.isOpen);
  const appSummary = useStore(chatStore.appSummary);

  if (!isOpen) {
    return null;
  }

  // Don't render if no app summary
  if (!appSummary) {
    return null;
  }

  const secrets = appSummary?.secrets ?? [];

  if (secrets.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1001]"
      onClick={() => secretsModalStore.close()}
    >
      <div
        className="bg-card rounded-md border border-border max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-foreground flex items-center justify-center">
              <Key className="text-background" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Secrets Configuration</h2>
              <p className="text-sm text-muted-foreground">
                {secrets.length} secret{secrets.length === 1 ? '' : 's'} to configure
              </p>
            </div>
          </div>
          <Button
            onClick={() => secretsModalStore.close()}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-foreground hover:text-foreground/80"
            aria-label="Close modal"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <Secrets />
        </div>
      </div>
    </div>
  );
}

export default GlobalSecretsModal;
