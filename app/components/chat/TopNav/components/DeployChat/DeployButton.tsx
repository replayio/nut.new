import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { toast } from 'react-toastify';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';
import { Button } from '~/components/ui/button';
import { chatStore } from '~/lib/stores/chat';
import { deployModalStore } from '~/lib/stores/deployModal';
import { workbenchStore } from '~/lib/stores/workbench';
import { database } from '~/lib/persistence/apps';
import { downloadRepository, lastDeployResult } from '~/lib/replay/Deploy';
import { ChevronDown, Check, Loader2, CloudUpload, Settings } from '~/components/ui/Icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { GlobalDeployChatModal } from './components/GlobalDeployChatModal';
import { DeployStatus } from '~/lib/stores/deployTypes';
import useViewport from '~/lib/hooks/useViewport';
import { classNames } from '~/utils/classNames';

export function DeployButton() {
  const status = useStore(deployModalStore.status);
  const appId = useStore(chatStore.currentAppId);

  const handleOpenModal = async (tab: 'default' | 'custom' = 'default') => {
    if (!appId) {
      toast.error('No app ID found');
      return;
    }

    deployModalStore.setLoadingData(true);
    deployModalStore.openWithTab(tab);

    // Check for database
    const repositoryId = workbenchStore.repositoryId.get();
    if (repositoryId) {
      try {
        const repositoryContents = await downloadRepository(repositoryId);
        const byteCharacters = atob(repositoryContents);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/zip' });

        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const zipContents = event.target.result as string;
            deployModalStore.setDatabaseFound(zipContents.includes('supabase'));
          }
        };
        reader.readAsText(blob);
      } catch (error) {
        console.error('Error downloading repository:', error);
        toast.error('Failed to download repository');
      }
    }

    // Load existing settings
    const existingSettings = await database.getAppDeploySettings(appId);
    if (existingSettings) {
      deployModalStore.setDeploySettings(existingSettings);
    }

    deployModalStore.setLoadingData(false);
    deployModalStore.setStatus(DeployStatus.NotStarted);
  };

  const isDeploying = status === DeployStatus.Started;
  const isDeployed = !!lastDeployResult(deployModalStore.deploySettings.get())?.siteURL;
  const isSmallViewport = useViewport(1024);
  const isOpen = useStore(deployModalStore.isOpen);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showModalContent, setShowModalContent] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDropdownOpen(false);
      setShowModalContent(false);
    }
  }, [isOpen]);

  const handleSelectItem = (tab: 'default' | 'custom') => (e: Event) => {
    e.preventDefault();
    handleOpenModal(tab);
    setShowModalContent(true);
  };

  const handleOpenChange = (open: boolean) => {
    setDropdownOpen(open);
    if (!open) {
      setShowModalContent(false);
    }
  };

  return (
    <TooltipProvider>
      <WithTooltip tooltip={isDeploying ? 'Deploying...' : isDeployed ? 'Deployed' : 'Deploy App'}>
        <DropdownMenu open={dropdownOpen} onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              disabled={isDeploying}
              className="h-9 px-4 gap-2 rounded-full border-border bg-card hover:bg-muted text-foreground shadow-xs disabled:opacity-60"
            >
              {isDeploying ? (
                <Loader2 className="animate-spin" size={16} />
              ) : isDeployed ? (
                <Check className="text-foreground" size={16} />
              ) : null}
              <span className="text-sm font-medium">
                {isDeploying ? 'Deploying...' : isDeployed ? 'Deployed' : 'Deploy'}
              </span>
              <ChevronDown size={16} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={classNames(
              showModalContent
                ? isSmallViewport
                  ? 'w-[calc(100vw-2rem)] max-w-[28rem] p-0'
                  : 'min-w-[28rem] p-0'
                : 'min-w-[10rem]',
            )}
          >
            {showModalContent ? (
              <GlobalDeployChatModal variant="popover" />
            ) : (
              <>
                <DropdownMenuItem onSelect={handleSelectItem('default')} className="gap-2 cursor-pointer">
                  <CloudUpload size={16} />
                  Deploy
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleSelectItem('custom')} className="gap-2 cursor-pointer">
                  <Settings size={16} />
                  Edit domain
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </WithTooltip>
    </TooltipProvider>
  );
}
