import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { History } from 'lucide-react';
import AppHistory from '~/components/panels/HistoryPanel/AppHistory';

export const HistoryPanel = () => {
  const appId = useStore(chatStore.currentAppId);

  return (
    <div className="@container flex flex-col h-full w-full bg-card rounded-md border border-border overflow-hidden">
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!appId ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 border border-border">
              <History className="text-muted-foreground" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No App Selected</h3>
            <p className="text-muted-foreground text-sm">
              Start a conversation to create an app and view its version history.
            </p>
          </div>
        ) : (
          <AppHistory appId={appId} />
        )}
      </div>
    </div>
  );
};
