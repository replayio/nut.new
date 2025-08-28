import React from 'react';
import { AppCard } from './AppCard';
import { type AppSummary } from '~/lib/persistence/messageAppSummary';

interface SecretsCardProps {
  appSummary: AppSummary;
  onViewDetails: () => void;
}

const BUILTIN_SECRET_NAMES = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];

export const SecretsCard: React.FC<SecretsCardProps> = ({ 
  appSummary, 
  onViewDetails 
}) => {
  const allSecrets = appSummary?.features?.flatMap((f) => f.secrets ?? []) ?? [];
  const setSecrets = appSummary?.setSecrets || [];
  
  const requiredSecrets = allSecrets.filter(secret => !BUILTIN_SECRET_NAMES.includes(secret.name));
  const setRequiredSecrets = requiredSecrets.filter(secret => setSecrets.includes(secret.name));
  
  const getStatusInfo = () => {
    if (requiredSecrets.length === 0) {
      return {
        status: 'completed' as const,
        progressText: 'No configuration needed',
      };
    }
    
    if (setRequiredSecrets.length === requiredSecrets.length) {
      return {
        status: 'completed' as const,
        progressText: 'All secrets configured',
      };
    }
    
    if (setRequiredSecrets.length > 0) {
      return {
        status: 'in-progress' as const,
        progressText: `${setRequiredSecrets.length}/${requiredSecrets.length} configured`,
      };
    }
    
    return {
      status: 'pending' as const,
      progressText: 'Configuration required',
    };
  };

  const statusInfo = getStatusInfo();
  
  const getDescription = () => {
    if (allSecrets.length === 0) {
      return 'No secrets required for this application';
    }
    
    const builtinCount = allSecrets.filter(s => BUILTIN_SECRET_NAMES.includes(s.name)).length;
    const requiredCount = requiredSecrets.length;
    
    if (requiredCount === 0 && builtinCount > 0) {
      return `Uses ${builtinCount} built-in secret${builtinCount === 1 ? '' : 's'}`;
    }
    
    if (requiredCount > 0 && builtinCount > 0) {
      return `${requiredCount} secret${requiredCount === 1 ? '' : 's'} to configure, ${builtinCount} built-in`;
    }
    
    return `${requiredCount} secret${requiredCount === 1 ? '' : 's'} need${requiredCount === 1 ? 's' : ''} configuration`;
  };

  const getSecretsSummary = () => {
    if (allSecrets.length === 0) return null;
    
    return (
      <div className="space-y-3">
        {requiredSecrets.length > 0 && (
          <div className="flex justify-between items-center p-3 bg-bolt-elements-background-depth-1/30 rounded-lg border border-bolt-elements-borderColor/30">
            <span className="text-sm text-bolt-elements-textSecondary">Required Secrets</span>
            <span className="text-sm font-medium text-bolt-elements-textPrimary">
              {setRequiredSecrets.length}/{requiredSecrets.length}
            </span>
          </div>
        )}
        
        {allSecrets.filter(s => BUILTIN_SECRET_NAMES.includes(s.name)).length > 0 && (
          <div className="flex items-center gap-2 text-sm text-bolt-elements-icon-success bg-bolt-elements-background-depth-1/30 p-2 rounded-lg border border-bolt-elements-borderColor/30">
            <div className="i-ph:check-circle-duotone" />
            <span className="text-bolt-elements-textPrimary">Built-in secrets configured automatically</span>
          </div>
        )}
      </div>
    );
  };

  // Only show card if there are secrets
  if (allSecrets.length === 0) {
    return null;
  }

  return (
    <AppCard
      title="Secrets Configuration"
      description={getDescription()}
      icon={<div className="i-ph:key-duotone text-white text-lg" />}
      iconColor="purple"
      status={statusInfo.status}
      progressText={statusInfo.progressText}
      onClick={onViewDetails}
    >
      {getSecretsSummary()}
    </AppCard>
  );
};
