import React from 'react';
import { AppCard } from './AppCard';
import { type AppSummary } from '~/lib/persistence/messageAppSummary';
import Secrets from '~/components/workbench/Preview/components/PlanView/components/Secrets';

interface SecretsCardProps {
  appSummary: AppSummary;
}

const BUILTIN_SECRET_NAMES = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];

export const SecretsCard: React.FC<SecretsCardProps> = ({ appSummary }) => {
  const allSecrets = appSummary?.features?.flatMap((f) => f.secrets ?? []) ?? [];
  const setSecrets = appSummary?.setSecrets || [];

  const requiredSecrets = allSecrets.filter((secret) => !BUILTIN_SECRET_NAMES.includes(secret.name));
  const setRequiredSecrets = requiredSecrets.filter((secret) => setSecrets.includes(secret.name));

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

    const builtinCount = allSecrets.filter((s) => BUILTIN_SECRET_NAMES.includes(s.name)).length;
    const requiredCount = requiredSecrets.length;

    if (requiredCount === 0 && builtinCount > 0) {
      return `Uses ${builtinCount} built-in secret${builtinCount === 1 ? '' : 's'}`;
    }

    if (requiredCount > 0 && builtinCount > 0) {
      return `${requiredCount} secret${requiredCount === 1 ? '' : 's'} to configure, ${builtinCount} built-in`;
    }

    return `${requiredCount} secret${requiredCount === 1 ? '' : 's'} need${requiredCount === 1 ? 's' : ''} configuration`;
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
    >
      <Secrets />
    </AppCard>
  );
};
