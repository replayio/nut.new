import React from 'react';
import { AppCard } from './AppCard';
import { type AppSummary } from '~/lib/persistence/messageAppSummary';

interface AuthSelectorCardProps {
  appSummary: AppSummary;
  onViewDetails: () => void;
}

const AuthRequiredSecret = 'VITE_AUTH_REQUIRED';

export const AuthSelectorCard: React.FC<AuthSelectorCardProps> = ({ 
  appSummary, 
  onViewDetails 
}) => {
  // Only show for apps with template versions
  if (!appSummary.templateVersion) {
    return null;
  }

  const authRequired = appSummary?.setSecrets?.includes(AuthRequiredSecret);

  const getDescription = () => {
    return authRequired 
      ? 'Users must create accounts and log in to access the application'
      : 'Application is open to all users without requiring authentication';
  };

  const getStatusBadge = () => {
    return authRequired ? (
      <div className="flex items-center gap-2 text-bolt-elements-icon-success bg-bolt-elements-background-depth-1/30 p-2 rounded-lg border border-bolt-elements-borderColor/30">
        <div className="i-ph:lock-duotone" />
        <span className="text-sm font-medium text-bolt-elements-textPrimary">Authentication Required</span>
      </div>
    ) : (
      <div className="flex items-center gap-2 text-bolt-elements-focus bg-bolt-elements-background-depth-1/30 p-2 rounded-lg border border-bolt-elements-borderColor/30">
        <div className="i-ph:globe-duotone" />
        <span className="text-sm font-medium text-bolt-elements-textPrimary">Public Access</span>
      </div>
    );
  };

  return (
    <AppCard
      title="Authentication Settings"
      description={getDescription()}
      icon={<div className="i-ph:shield-check-duotone text-white text-lg" />}
      iconColor="indigo"
      status="completed"
      progressText="Configured"
      onClick={onViewDetails}
    >
      {getStatusBadge()}
    </AppCard>
  );
};
