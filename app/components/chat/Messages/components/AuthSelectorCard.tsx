import React, { useState } from 'react';
import { AppCard } from './AppCard';
import { Switch } from '~/components/ui/Switch';
import { type AppSummary } from '~/lib/persistence/messageAppSummary';
import { chatStore, onChatResponse } from '~/lib/stores/chat';
import { callNutAPI } from '~/lib/replay/NutAPI';
import { toast } from 'react-toastify';
import { assert } from '~/utils/nut';

interface AuthSelectorCardProps {
  appSummary: AppSummary;
}

const AuthRequiredSecret = 'VITE_AUTH_REQUIRED';

export const AuthSelectorCard: React.FC<AuthSelectorCardProps> = ({ appSummary }) => {
  // Only show for apps with template versions
  if (!appSummary.templateVersion) {
    return null;
  }

  const appId = chatStore.currentAppId.get();
  assert(appId, 'App ID is required');

  const [saving, setSaving] = useState(false);
  const authRequired = appSummary?.setSecrets?.includes(AuthRequiredSecret);

  const handleToggle = async () => {
    setSaving(true);

    try {
      const { response } = await callNutAPI('set-app-secrets', {
        appId,
        secrets: [
          {
            key: AuthRequiredSecret,
            value: authRequired ? undefined : 'true',
          },
        ],
      });

      if (response) {
        onChatResponse(response, 'ToggleRequireAuth');
      }

      toast.success('Authentication settings updated successfully');
    } catch (error) {
      toast.error('Failed to update authentication settings');
      console.error('Failed to update authentication settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const getDescription = () => {
    return authRequired
      ? 'Users must create accounts and log in to access the application'
      : 'Application is open to all users without requiring authentication';
  };

  const getToggleControl = () => {
    return (
      <button
        className={`group p-4 bg-bolt-elements-background-depth-1/50 rounded-xl border transition-all duration-200 w-full ${
          saving
            ? 'border-bolt-elements-borderColor/30 cursor-not-allowed'
            : 'border-bolt-elements-borderColor/40 hover:border-bolt-elements-focus/40 hover:bg-bolt-elements-background-depth-1/70 cursor-pointer'
        }`}
        onClick={!saving ? handleToggle : undefined}
        disabled={saving}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`${authRequired ? 'i-ph:lock-duotone text-bolt-elements-icon-success' : 'i-ph:globe-duotone text-bolt-elements-textPrimary'}`}
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-bolt-elements-textPrimary">
                {authRequired ? 'Authentication Required' : 'Public Access'}
              </span>
              <span className="text-xs text-bolt-elements-textSecondary group-hover:text-bolt-elements-textPrimary transition-colors">
                {saving ? 'Updating...' : null}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <div className="w-4 h-4 rounded-full border-2 border-bolt-elements-borderColor border-t-blue-500 animate-spin" />
            )}
            <Switch
              checked={authRequired}
              onCheckedChange={!saving ? handleToggle : undefined}
              className={`${saving ? 'opacity-50' : 'group-hover:scale-105'} transition-all duration-200 pointer-events-none`}
            />
          </div>
        </div>
      </button>
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
    >
      {getToggleControl()}
    </AppCard>
  );
};
