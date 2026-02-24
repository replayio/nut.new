import { memo } from 'react';
import { InfoCard } from '~/components/ui/InfoCard';
import { AppFeatureStatus, type AppFeature } from '~/lib/persistence/messageAppSummary';
import { openIntegrationTestsModal } from '~/lib/stores/featureModal';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';

interface IntegrationTestsCardProps {
  tests: AppFeature[];
  sendMessage: (params: ChatMessageParams) => void;
}

export const IntegrationTestsCard = memo(({ tests, sendMessage }: IntegrationTestsCardProps) => {
  const hasFailedTests = tests.some((t) => t.status === AppFeatureStatus.Failed);
  const allImplemented = tests.every((t) => t.status === AppFeatureStatus.Implemented);

  const iconType = hasFailedTests ? 'error' : allImplemented ? 'success' : 'loading';
  const variant = 'default';

  const passedCount = tests.filter((t) => t.status === AppFeatureStatus.Implemented).length;
  const failedCount = tests.filter((t) => t.status === AppFeatureStatus.Failed).length;
  const description = `${tests.length} integration test${tests.length !== 1 ? 's' : ''} • ${passedCount} passed${failedCount > 0 ? ` • ${failedCount} failed` : ''}`;

  return (
    <div className="mt-5">
      <InfoCard
        title="Integration Tests"
        description={description}
        iconType={iconType}
        variant={variant}
        onCardClick={() => {
          openIntegrationTestsModal('completed');
        }}
        className="shadow-sm"
        handleSendMessage={sendMessage}
      />
    </div>
  );
});

IntegrationTestsCard.displayName = 'IntegrationTestsCard';
