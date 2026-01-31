import React, { useEffect } from 'react';
import { StartBuildingButton } from '~/components/chat/StartBuildingButton';
import { ChatMode } from '~/lib/replay/SendChatMessage';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';
import { Rocket } from '~/components/ui/Icon';

interface ContinueBuildCardProps {
  sendMessage?: (params: ChatMessageParams) => void;
  setShowContinueBuildCard?: (show: boolean) => void;
  onMount?: () => void;
}

export const ContinueBuildCard: React.FC<ContinueBuildCardProps> = ({
  sendMessage,
  onMount,
  setShowContinueBuildCard,
}) => {
  useEffect(() => {
    if (onMount) {
      onMount();
    }
  }, []);

  const handleContinueBuilding = () => {
    if (sendMessage) {
      sendMessage({
        messageInput: 'Continue building the app based on these requirements.',
        chatMode: ChatMode.DevelopApp,
      });

      if (setShowContinueBuildCard) {
        setShowContinueBuildCard(false);
      }
    }
  };

  return (
    <div className="w-full mt-5">
      <div className="bg-card border border-border rounded-md p-6 transition-colors hover:bg-accent/50">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center justify-center w-12 h-12 bg-foreground text-background rounded-md">
            <Rocket className="text-background" size={24} />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Continue Building Your App!</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Ready to continue building your app? Click the button below to pick up where you left off.
            </p>
          </div>

          <div className="relative">
            <StartBuildingButton
              onClick={handleContinueBuilding}
              buttonText="Continue Building!"
              tooltip="Continue Building Your App!"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
