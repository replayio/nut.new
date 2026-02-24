import { memo } from 'react';
import { InfoCard } from '~/components/ui/InfoCard';
import { AppFeatureKind, AppFeatureStatus, type AppFeature } from '~/lib/persistence/messageAppSummary';
import { openFeatureModal } from '~/lib/stores/featureModal';
import type { ChatMessageParams } from '~/components/chat/ChatComponent/components/ChatImplementer/ChatImplementer';

interface FeatureCardProps {
  feature: AppFeature;
  allFeatures: AppFeature[];
  sendMessage: (params: ChatMessageParams) => void;
}

export const FeatureCard = memo(({ feature, allFeatures, sendMessage }: FeatureCardProps) => {
  const iconType =
    feature.status === AppFeatureStatus.ImplementationInProgress
      ? 'loading'
      : feature.status === AppFeatureStatus.Failed
        ? 'error'
        : 'success';

  const variant = feature.status === AppFeatureStatus.ImplementationInProgress ? 'active' : 'default';

  const filteredFeatures = allFeatures?.filter((f) => f.kind !== AppFeatureKind.DesignAPIs) || [];
  const modalIndex = filteredFeatures.findIndex((f) => f === feature);

  return (
    <div className="mt-5">
      <InfoCard
        title={feature.name}
        description={feature.description}
        iconType={iconType}
        variant={variant}
        onCardClick={
          modalIndex !== -1
            ? () => {
                openFeatureModal(modalIndex, filteredFeatures.length);
              }
            : undefined
        }
        className="shadow-sm"
        handleSendMessage={sendMessage}
      />
    </div>
  );
});

FeatureCard.displayName = 'FeatureCard';
