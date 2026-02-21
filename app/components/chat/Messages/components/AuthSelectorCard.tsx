import React, { useEffect, useState } from 'react';
import { Switch } from '~/components/ui/Switch';
import { type AppSummary } from '~/lib/persistence/messageAppSummary';
import { chatStore } from '~/lib/stores/chat';
import { toast } from 'react-toastify';
import { assert } from '~/utils/nut';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';
import AllowedDomainsDialog from '~/components/ui/AllowedDomainsDialog';
import { Lock, Globe, ShieldCheck, Check } from '~/components/ui/Icon';
import { AuthRequiredSecret } from '~/lib/persistence/messageAppSummary';
import { getAppSetSecrets, setAppSecrets } from '~/lib/replay/Secrets';

interface AuthSelectorCardProps {
  appSummary: AppSummary;
}

export const AuthSelectorCard: React.FC<AuthSelectorCardProps> = ({ appSummary }) => {
  const appId = chatStore.currentAppId.get();
  assert(appId, 'App ID is required');

  const [saving, setSaving] = useState(false);
  const [showDomains, setShowDomains] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    const fetchAuthRequired = async () => {
      const appSetSecrets = await getAppSetSecrets(appId);
      setAuthRequired(appSetSecrets.includes(AuthRequiredSecret));
    };
    fetchAuthRequired();
  }, [appSummary]);

  const handleToggle = async () => {
    setSaving(true);

    try {
      await setAppSecrets(appId, [
        {
          key: AuthRequiredSecret,
          value: authRequired ? undefined : 'true',
        },
      ]);

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
    const tooltipText = authRequired
      ? 'Disable authentication - anyone can access your app'
      : 'Enable authentication - requires user accounts to access your app';

    return (
      <TooltipProvider>
        <WithTooltip tooltip={tooltipText}>
          <button
            className={`group p-4 bg-muted rounded-xl border transition-all duration-200 w-full shadow-sm ${
              saving
                ? 'border-border/30 cursor-not-allowed opacity-60'
                : 'border-border hover:border-ring/60 hover:bg-accent hover:shadow-md hover:scale-[1.02] cursor-pointer'
            }`}
            onClick={!saving ? handleToggle : undefined}
            disabled={saving}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {authRequired ? (
                  <Lock className="transition-transform duration-200 group-hover:scale-110 text-green-500" size={18} />
                ) : (
                  <Globe
                    className="transition-transform duration-200 group-hover:scale-110 text-foreground"
                    size={18}
                  />
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground transition-transform duration-200 group-hover:scale-105">
                    {authRequired ? 'Authentication Required' : 'Public Access'}
                  </span>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-all duration-200">
                    {saving ? 'Updating...' : null}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {saving && (
                  <div className="w-4 h-4 rounded-full border-2 border-border border-t-blue-500 animate-spin" />
                )}
                <Switch
                  checked={authRequired}
                  onCheckedChange={!saving ? handleToggle : undefined}
                  className={`${saving ? 'opacity-50' : 'group-hover:scale-110'} transition-all duration-200 pointer-events-none`}
                />
              </div>
            </div>
          </button>
        </WithTooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="relative rounded-xl transition-all duration-300 shadow-sm">
      <div className="bg-muted rounded-xl transition-all duration-300 relative overflow-hidden p-5 border border-border">
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600">
              <ShieldCheck className="text-white" size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground truncate">Authentication Settings</h3>
              <div className="mt-1.5 flex items-center">
                <div className="flex items-center gap-2 text-green-500">
                  <Check size={14} strokeWidth={2.5} />
                  <span className="text-sm font-medium text-green-600">Configured</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground leading-relaxed mb-3">{getDescription()}</div>

          <div className="mt-3">
            <div className="space-y-3">
              {getToggleControl()}
              {authRequired && (
                <div>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-sm rounded-xl border text-foreground border-border bg-muted hover:bg-accent transition-all duration-200 hover:scale-[1.02] hover:shadow-md font-medium"
                    onClick={() => setShowDomains(true)}
                  >
                    Set Allowed Domains
                  </button>
                  <AllowedDomainsDialog open={showDomains} onOpenChange={setShowDomains} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
