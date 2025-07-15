import ReactModal from 'react-modal';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { downloadRepository } from '~/lib/replay/Deploy';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';

ReactModal.setAppElement('#root');

// Component for downloading an app's contents to disk.

export function DownloadButton() {
  const handleDownload = async () => {
    const repositoryId = workbenchStore.repositoryId.get();
    if (!repositoryId) {
      toast.error('No repository ID found');
      return;
    }

    try {
      const repositoryContents = await downloadRepository(repositoryId);

      // Convert base64 to blob
      const byteCharacters = atob(repositoryContents);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/zip' });

      // Create download link and trigger save dialog
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `repository-${repositoryId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Repository downloaded successfully');
    } catch (error) {
      console.error('Error downloading repository:', error);
      toast.error('Failed to download repository');
    }
  };

  return (
    <>
      <TooltipProvider>
        <WithTooltip tooltip="Download Code">
          <button
            className="flex gap-2 bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded-md p-2 transition-theme"
            onClick={handleDownload}
          >
            <div className="i-ph:download-fill text-[1.3em]" />
          </button>
        </WithTooltip>
      </TooltipProvider>
    </>
  );
}
