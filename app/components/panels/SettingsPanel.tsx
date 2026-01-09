import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { AuthSelectorComponent } from '~/components/header/components/AppSettings/components/AuthSelectorComponent';
import { SecretsComponent } from '~/components/header/components/AppSettings/components/SecretsComponent';
import { PermissionsSelectionComponent } from '~/components/header/components/AppSettings/components/PermissionsSelectionComponent';
import { ExperimentalFeaturesComponent } from '~/components/header/components/AppSettings/components/ExperimentalFeaturesComponent';
import { AppAccessKind, isAppAccessAllowed, isAppOwner } from '~/lib/api/permissions';
import { isAppOwnerStore, permissionsStore, setIsAppOwner } from '~/lib/stores/permissions';
import { userStore } from '~/lib/stores/auth';
import CopyApp from '~/components/header/components/AppSettings/components/CopyApp';
import ClearAppHistory from '~/components/header/components/AppSettings/components/ClearAppHistory';
import { Settings, Type } from 'lucide-react';
import { Skeleton } from '~/components/ui/Skeleton';

export const SettingsPanel = () => {
  const appSummary = useStore(chatStore.appSummary);
  const allSecrets = appSummary?.features?.flatMap((f) => f.secrets ?? []) ?? [];
  const appId = useStore(chatStore.currentAppId);
  const permissions = useStore(permissionsStore);
  const isOwner = useStore(isAppOwnerStore);
  const user = useStore(userStore);

  useEffect(() => {
    const loadIsOwner = async () => {
      const ownerStatus = await isAppOwner(appId ?? '', user?.id ?? '');
      setIsAppOwner(ownerStatus);
    };

    if (appId && user?.id) {
      loadIsOwner();
    }
  }, [appId, user?.id]);

  const isLoading = !appSummary && appId;

  return (
    <div className="@container flex flex-col h-full w-full bg-bolt-elements-background-depth-1 rounded-xl border border-bolt-elements-borderColor shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-bolt-elements-background-depth-1 border-b border-bolt-elements-borderColor border-opacity-50 shadow-sm rounded-t-xl">
        <div className="flex items-center justify-between px-4 h-[38px]">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-bolt-elements-textSecondary" />
            <span className="text-bolt-elements-textSecondary text-sm font-medium">Settings</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : !appId ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-16 h-16 bg-bolt-elements-background-depth-2 rounded-2xl flex items-center justify-center mb-4 border border-bolt-elements-borderColor">
              <Settings className="text-bolt-elements-textSecondary" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-bolt-elements-textHeading mb-2">No App Selected</h3>
            <p className="text-bolt-elements-textSecondary text-sm">
              Start a conversation to create an app and configure its settings.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* App Name Section */}
            <div className="p-4 bg-bolt-elements-background-depth-2 rounded-xl border border-bolt-elements-borderColor">
              <h3 className="text-sm font-semibold text-bolt-elements-textHeading mb-3 flex items-center gap-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center shadow-sm bg-blue-500">
                  <Type className="text-white" size={14} />
                </div>
                Application Name
              </h3>
              <ChatDescription />
            </div>

            {/* Authentication Settings */}
            {appSummary && <AuthSelectorComponent appSummary={appSummary} />}

            {/* API Integrations */}
            {appSummary && allSecrets.length > 0 && <SecretsComponent appSummary={appSummary} />}

            {/* Experimental Features */}
            {appSummary && <ExperimentalFeaturesComponent appSummary={appSummary} />}

            {/* Permissions */}
            {appId &&
              isAppAccessAllowed(permissions, AppAccessKind.SetPermissions, user?.email ?? '', isOwner) && (
                <PermissionsSelectionComponent />
              )}

            {/* Copy App */}
            {appId && isAppAccessAllowed(permissions, AppAccessKind.Copy, user?.email ?? '', isOwner) && (
              <CopyApp />
            )}

            {/* Clear App History */}
            {appId && isAppAccessAllowed(permissions, AppAccessKind.Delete, user?.email ?? '', isOwner) && (
              <ClearAppHistory />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

