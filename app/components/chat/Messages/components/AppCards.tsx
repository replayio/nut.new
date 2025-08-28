import React from 'react';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { openAppCardModal, type AppCardModalType } from '~/lib/stores/appCardModal';
import { FeaturesCard } from './FeaturesCard';
import { MockupCard } from './MockupCard';
import { PageLayoutsCard } from './PageLayoutsCard';
import { SecretsCard } from './SecretsCard';
import { AuthSelectorCard } from './AuthSelectorCard';
import { type AppFeature } from '~/lib/persistence/messageAppSummary';

export const AppCards: React.FC = () => {
  const appSummary = useStore(chatStore.appSummary);

  if (!appSummary) {
    return null;
  }

  const openModal = (type: AppCardModalType, feature?: AppFeature) => {
    openAppCardModal(type, appSummary, feature);
  };

  const cards = [];

    // 1. Mockup Card - show if mockupStatus exists
    if (appSummary.mockupStatus) {
        cards.push(
            <MockupCard
            key="mockup"
            mockupStatus={appSummary.mockupStatus}
            onViewDetails={() => openModal('mockup')}
            />
        );
    }

  // 2. Authentication Card - show if templateVersion exists
  if (appSummary.templateVersion) {
    cards.push(
      <AuthSelectorCard
        key="auth"
        appSummary={appSummary}
        onViewDetails={() => openModal('auth')}
      />
    );
  }

  // 3. Secrets Card - show if there are any secrets
  const hasSecrets = appSummary.features?.some((f) => f.secrets?.length);
  if (hasSecrets) {
    cards.push(
      <SecretsCard
        key="secrets"
        appSummary={appSummary}
        onViewDetails={() => openModal('secrets')}
      />
    );
  }

  // 4. Page Layouts Card - show if there are pages
  if (appSummary.pages && appSummary.pages.length > 0) {
    cards.push(
      <PageLayoutsCard
        key="pages"
        appSummary={appSummary}
        onViewDetails={() => openModal('pages')}
      />
    );
  }

  // 5. Features Card - show if there are features or a description
  if (appSummary.description || (appSummary.features && appSummary.features.length > 0)) {
    cards.push(
      <FeaturesCard
        key="features"
        appSummary={appSummary}
        onViewDetails={() => openModal('features')}
      />
    );
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 px-1">
      {cards}
    </div>
  );
};
