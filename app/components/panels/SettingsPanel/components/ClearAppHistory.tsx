import { useState } from 'react';
import { toast } from 'react-toastify';
import { database } from '~/lib/persistence/apps';
import { chatStore } from '~/lib/stores/chat';
import { useStore } from '@nanostores/react';
import { Trash2 } from '~/components/ui/Icon';
import { Button } from '~/components/ui/button';

const ClearAppHistory = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const appId = useStore(chatStore.currentAppId);

  const handleClearClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmClear = async () => {
    if (!appId || isClearing) {
      return;
    }

    setIsClearing(true);

    try {
      await database.clearAppHistory(appId);
      chatStore.messages.set([]);
      chatStore.events.set([]);
      toast.success('Chat history cleared successfully!');
      setShowConfirmation(false);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      toast.error('Failed to clear chat history. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleCancelClear = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Clear Chat History</h3>
        <p className="text-xs text-muted-foreground mt-1">Remove all chat messages from this application</p>
      </div>

      <div className="p-4 border border-border rounded-md bg-card">
        <div className="flex flex-col items-center gap-3">
          {!showConfirmation ? (
            <>
              <p className="text-sm text-muted-foreground text-center">
                This action cannot be undone. All chat messages will be permanently removed.
              </p>
              <Button onClick={handleClearClick} variant="outline" className="h-9 text-foreground">
                <span className="flex items-center gap-2">
                  <Trash2 size={16} className="text-muted-foreground" />
                  Clear Chat History
                </span>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-foreground text-center font-medium">
                Are you sure you want to clear the chat history?
              </p>
              <p className="text-xs text-muted-foreground text-center">This action cannot be undone.</p>
              <div className="flex gap-3 mt-2">
                <Button onClick={handleConfirmClear} disabled={isClearing} variant="default" className="h-9">
                  {isClearing ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
                      Clearing...
                    </span>
                  ) : (
                    <span>Yes, Clear History</span>
                  )}
                </Button>
                <Button onClick={handleCancelClear} variant="outline" className="h-9" disabled={isClearing}>
                  <span>Cancel</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClearAppHistory;
