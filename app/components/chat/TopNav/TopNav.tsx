import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { ShareButton } from './components/ShareButton';
import { DownloadButton } from './components/DownloadButton';
import { DeployButton } from './components/DeployChat/DeployButton';
import { ArrowLeft, MoreHorizontal, Bug } from '~/components/ui/Icon';
import { Button } from '~/components/ui/button';
import { ClientAuth } from '~/components/auth/ClientAuth';
import useViewport from '~/lib/hooks';
import { ChatDescription } from '~/components/panels/SettingsPanel/components/ChatDescription.client';
import { DebugAppButton } from '~/components/ui/DebugControls';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { isAdmin } from '~/lib/utils';
import { userStore } from '~/lib/stores/auth';

export function TopNav() {
  const appId = useStore(chatStore.currentAppId);
  const repositoryId = useStore(workbenchStore.pendingRepositoryId);
  const isSmallViewport = useViewport(1024);
  const user = useStore(userStore);
  const handleBack = () => {
    window.location.href = '/';
  };

  const showDebugButton = isAdmin(user) && appId;

  return (
    <nav className="flex items-center justify-between h-[60px] px-2 gap-2 bg-accent">
      {/* Left section: Back button + Project title */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-9 w-9 shrink-0 text-foreground hover:bg-accent"
        >
          <ArrowLeft size={16} />
        </Button>

        {/* Separator */}
        <div className="w-px h-8 bg-border shrink-0" />
        <div className="flex-1 min-w-0 py-1">
          <ChatDescription />
        </div>
      </div>

      {/* Right section: Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {isSmallViewport ? (
          /* Mobile: Dropdown menu */
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {showDebugButton && (
                <DropdownMenuItem
                  onClick={() => {
                    const url = `https://ui.honeycomb.io/replay/datasets/backend?query=${encodeURIComponent(
                      JSON.stringify({
                        time_range: 24 * 60 * 60,
                        granularity: 0,
                        breakdowns: [
                          'telemetry.category',
                          'telemetry.data.nut.job_kind',
                          'telemetry.data.error.errorBucket_start',
                        ],
                        calculations: [
                          { op: 'COUNT' },
                          { op: 'AVG', column: 'telemetry.data.success' },
                          { op: 'AVG', column: 'telemetry.data.fatal' },
                        ],
                        filters: [{ column: 'app', op: '=', value: appId }],
                        filter_combination: 'OR',
                        orders: [{ op: 'COUNT', order: 'descending' }],
                        havings: [],
                        limit: 100,
                      }),
                    )}`;
                    window.open(url, '_blank');
                  }}
                >
                  <Bug size={16} />
                  Open in Honeycomb
                </DropdownMenuItem>
              )}
              {appId && <ShareButton asMenuItem />}
              {repositoryId && <DownloadButton asMenuItem />}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          /* Desktop: Individual buttons */
          <>
            <DebugAppButton />
            {appId && <ShareButton />}
            {repositoryId && <DownloadButton />}
          </>
        )}
        {repositoryId && appId && <DeployButton />}
        {isSmallViewport && <ClientAuth />}
      </div>
    </nav>
  );
}
