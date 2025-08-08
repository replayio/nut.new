import ReactModal from 'react-modal';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { downloadRepository } from '~/lib/replay/Deploy';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';

ReactModal.setAppElement('#root');

export function DownloadButton() {
  const handleDownload = async () => {
    const repositoryId = workbenchStore.repositoryId.get();
    if (!repositoryId) {
      toast.error('No repository ID found');
      return;
    }

    try {
      const repositoryContents = await downloadRepository(repositoryId);

      const byteCharacters = atob(repositoryContents);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/zip' });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `repository-${repositoryId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Repository downloaded successfully');
      if (window.analytics) {
        window.analytics.track('Repository Downloaded', {
          repositoryId,
          timestamp: new Date().toISOString(),
          method: 'download_button',
        });
      }
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
            className="flex items-center justify-center p-2.5 rounded-xl bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary border border-bolt-elements-borderColor transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 group"
            onClick={handleDownload}
          >
            <div className="i-ph:download-fill text-xl transition-transform duration-200 group-hover:scale-110" />
          </button>
        </WithTooltip>
      </TooltipProvider>
    </>
  );
}
