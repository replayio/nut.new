import React, { useEffect } from 'react';
import { StartBuildingButton } from '~/components/chat/StartBuildingButton';
import { ChatMode } from '~/lib/replay/SendChatMessage';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';
import { workbenchStore } from '~/lib/stores/workbench';
import { mobileNavStore } from '~/lib/stores/mobileNav';
import { useStore } from '@nanostores/react';
import { userStore } from '~/lib/stores/auth';
import { Rocket } from '~/components/ui/Icon';

interface StartBuildingCardProps {
  startPlanningRating: number;
  sendMessage?: (params: ChatMessageParams) => void;
  onMount?: () => void;
}

export const StartBuildingCard: React.FC<StartBuildingCardProps> = ({ startPlanningRating, sendMessage, onMount }) => {
  const user = useStore(userStore);
  useEffect(() => {
    if (onMount) {
      onMount();
    }
  }, []);

  const handleStartBuilding = () => {
    if (sendMessage) {
      const message = 'Start building the app based on these requirements.';

      sendMessage({ messageInput: message, chatMode: ChatMode.DevelopApp });

      if (window.analytics) {
        window.analytics.track('Clicked Start Building button', {
          timestamp: new Date().toISOString(),
          userId: user?.id,
          email: user?.email,
        });
      }

      setTimeout(() => {
        workbenchStore.setShowWorkbench(true);
        mobileNavStore.setShowMobileNav(true);
        mobileNavStore.setActiveTab('canvas');
      }, 2000);
    }
  };

  return (
    <div className="w-full mt-5">
      <div className="bg-card border border-border rounded-md p-6 transition-colors duration-200 hover:bg-accent/50">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center justify-center w-12 h-12 bg-foreground text-background rounded-md">
            <Rocket size={24} />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Ready to Create Your App?</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              I have all the information I need to start generating your app.
            </p>
          </div>

          <div className="relative">
            <StartBuildingButton
              onClick={handleStartBuilding}
              startPlanningRating={startPlanningRating}
              buttonText="Start Building!"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
