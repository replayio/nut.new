import React from 'react';
import { AppCard } from './AppCard';
import { AppFeatureStatus } from '~/lib/persistence/messageAppSummary';

interface MockupCardProps {
  mockupStatus: AppFeatureStatus;
  onViewDetails: () => void;
}

export const MockupCard: React.FC<MockupCardProps> = ({ 
  mockupStatus, 
  onViewDetails 
}) => {
  const getStatusInfo = () => {
    switch (mockupStatus) {
      case AppFeatureStatus.NotStarted:
        return {
          status: 'pending' as const,
          progressText: 'Not Started',
        };
      case AppFeatureStatus.ImplementationInProgress:
        return {
          status: 'in-progress' as const,
          progressText: 'Building mockup...',
        };
      case AppFeatureStatus.Implemented:
        return {
          status: 'in-progress' as const,
          progressText: 'Mockup built',
        };
      case AppFeatureStatus.ValidationInProgress:
        return {
          status: 'in-progress' as const,
          progressText: 'Testing mockup...',
        };
      case AppFeatureStatus.Validated:
        return {
          status: 'completed' as const,
          progressText: 'Tests Passed',
        };
      case AppFeatureStatus.ValidationFailed:
        return {
          status: 'failed' as const,
          progressText: 'Tests Failed',
        };
      default:
        return {
          status: 'pending' as const,
          progressText: 'Pending',
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <AppCard
      title="Building Mockup"
      description="Builds a mockup of the app with a complete UI but no functionality."
      icon={<div className="i-ph:hammer text-white text-lg" />}
      iconColor="indigo"
      status={statusInfo.status}
      progressText={statusInfo.progressText}
      onClick={onViewDetails}
    >
      <div className="text-xs text-bolt-elements-textSecondary bg-bolt-elements-background-depth-1/30 px-2 py-1.5 rounded border border-bolt-elements-borderColor/30">
        Creates the visual foundation for your application
      </div>
    </AppCard>
  );
};
