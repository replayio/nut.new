import React, { useEffect, useState } from 'react';
import { doAbortChat } from '~/lib/stores/chat';
import { StopCircle } from '~/components/ui/Icon';

interface StopBuildCardProps {
  onMount?: () => void;
}

export const StopBuildCard: React.FC<StopBuildCardProps> = ({ onMount }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (onMount) {
      onMount();
    }
  }, []);

  const handleStopBuildClick = (event: React.MouseEvent) => {
    event.preventDefault();
    setShowConfirmation(true);
  };

  const handleConfirmStop = (event: React.MouseEvent) => {
    event.preventDefault();
    doAbortChat();
  };

  const handleCancelStop = (event: React.MouseEvent) => {
    event.preventDefault();
    setShowConfirmation(false);
  };

  return (
    <div className="w-full mt-5">
      <div className="bg-card border border-border rounded-md p-6 transition-colors duration-200 hover:bg-accent/50 relative overflow-hidden">
        <div className="absolute inset-0 rounded-md overflow-hidden">
          <div className="absolute inset-0 rounded-md bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent animate-flow-left-to-right" />
        </div>

        <div className="flex flex-col items-center text-center space-y-4 relative">
          {!showConfirmation ? (
            <>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Build in Progress</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Your app is currently being built. Click the button below to stop the build process if desired.
                </p>
              </div>

              <button
                onClick={handleStopBuildClick}
                className="px-6 py-3 rounded-md font-semibold text-destructive-foreground bg-destructive hover:bg-destructive/90 transition-colors duration-200 flex items-center justify-center gap-2 min-h-[44px]"
              >
                <StopCircle size={18} strokeWidth={2.5} />
                <span>Stop Build</span>
              </button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Confirm Stop Build?</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  Are you sure you want to stop the build process? This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmStop}
                  className="px-6 py-3 rounded-md font-semibold text-background bg-foreground hover:bg-foreground/90 transition-colors duration-200 flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <span>Yes</span>
                </button>

                <button
                  onClick={handleCancelStop}
                  className="px-6 py-3 rounded-md font-semibold text-foreground bg-muted hover:bg-accent transition-colors duration-200 border border-border flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <span>No</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
