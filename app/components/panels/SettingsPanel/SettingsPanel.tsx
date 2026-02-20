import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { ChatDescription } from '~/components/panels/SettingsPanel/components/ChatDescription.client';
import { AuthSelectorComponent } from './components/AuthSelectorComponent';
import { SecretsComponent } from './components/SecretsComponent';
import { PermissionsSelectionComponent } from './components/PermissionsSelectionComponent';
import { ExperimentalFeaturesComponent } from './components/ExperimentalFeaturesComponent';
import { AppAccessKind, isAppAccessAllowed, isAppOwner } from '~/lib/api/permissions';
import { isAppOwnerStore, permissionsStore, setIsAppOwner } from '~/lib/stores/permissions';
import { userStore } from '~/lib/stores/auth';
import CopyApp from './components/CopyApp';
import ClearAppHistory from './components/ClearAppHistory';
import { Settings } from 'lucide-react';
import { Skeleton } from '~/components/ui/Skeleton';

export const SettingsPanel = () => {
  const appSummary = useStore(chatStore.appSummary);
  const allSecrets = appSummary?.secrets ?? [];
  const appId = useStore(chatStore.currentAppId);
  const permissions = useStore(permissionsStore);
  const isOwner = useStore(isAppOwnerStore);
  const user = useStore(userStore);

  console.log('DEBUG: appSummary', appSummary);
  console.log('DEBUG: allSecrets', allSecrets);

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
    <div className="@container flex flex-col h-full w-full bg-card rounded-md border border-border overflow-hidden">
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
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 border border-border">
              <Settings className="text-muted-foreground" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No App Selected</h3>
            <p className="text-muted-foreground text-sm">
              Start a conversation to create an app and configure its settings.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">Application Name</h3>
              <ChatDescription />
            </div>

            {/* Authentication Settings */}
            {appSummary && (
              <>
                <div className="border-t border-border" />
                <AuthSelectorComponent appSummary={appSummary} />
              </>
            )}

            {/* Permissions */}
            {appId && isAppAccessAllowed(permissions, AppAccessKind.SetPermissions, user?.email ?? '', isOwner) && (
              <>
                <div className="border-t border-border" />
                <PermissionsSelectionComponent />
              </>
            )}

            {/* API Integrations */}
            {appSummary && allSecrets.length > 0 && (
              <>
                <div className="border-t border-border" />
                <SecretsComponent appSummary={appSummary} />
              </>
            )}

            {/* Experimental Features */}
            {appSummary && (
              <>
                <div className="border-t border-border" />
                <ExperimentalFeaturesComponent appSummary={appSummary} />
              </>
            )}

            {/* Copy App */}
            {appId && isAppAccessAllowed(permissions, AppAccessKind.Copy, user?.email ?? '', isOwner) && (
              <>
                <div className="border-t border-border" />
                <CopyApp />
              </>
            )}

            {/* Clear App History */}
            {appId && isAppAccessAllowed(permissions, AppAccessKind.Delete, user?.email ?? '', isOwner) && (
              <>
                <div className="border-t border-border" />
                <ClearAppHistory />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
