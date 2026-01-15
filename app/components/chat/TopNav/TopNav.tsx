import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { ProjectTitle } from './ProjectTitle';
import { ShareButton } from './ShareButton';
import { TopNavDownloadButton } from './TopNavDownloadButton';
import { TopNavDeployButton } from './TopNavDeployButton';
import { ArrowLeft } from '~/components/ui/Icon';
import { Button } from '~/components/ui/button';

export function TopNav() {
  const appId = useStore(chatStore.currentAppId);
  const repositoryId = useStore(workbenchStore.pendingRepositoryId);

  const handleBack = () => {
    window.location.href = '/';
  };

  return (
    <nav className="flex items-center justify-between h-[60px] px-4 bg-bolt-elements-background-depth-2 border-b border-bolt-elements-borderColor">
      {/* Left section: Back button + Project title */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-9 w-9 shrink-0 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3"
        >
          <ArrowLeft size={16} />
        </Button>

        {/* Separator */}
        <div className="w-px h-8 bg-bolt-elements-borderColor mx-1" />

        <ProjectTitle />
      </div>

      {/* Right section: Action buttons */}
      <div className="flex items-center gap-1">
        {appId && <ShareButton />}
        {repositoryId && <TopNavDownloadButton />}
        {repositoryId && appId && <TopNavDeployButton />}
      </div>
    </nav>
  );
}
