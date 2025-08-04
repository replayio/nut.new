import { toast } from 'react-toastify';
import ReactModal from 'react-modal';
import { useState } from 'react';
import { useStore } from '@nanostores/react';
import type { DeploySettings } from '~/lib/replay/Deploy';
import { workbenchStore } from '~/lib/stores/workbench';
import { chatStore } from '~/lib/stores/chat';
import { database } from '~/lib/persistence/apps';
import { deployApp, downloadRepository, lastDeployResult } from '~/lib/replay/Deploy';
import DeployChatModal from './components/DeployChatModal';
import { generateRandomId } from '~/utils/nut';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';

ReactModal.setAppElement('#root');

export enum DeployStatus {
  NotStarted,
  Started,
  Succeeded,
}

export function DeployChatButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deploySettings, setDeploySettings] = useState<DeploySettings>({});
  const [error, setError] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<DeployStatus>(DeployStatus.NotStarted);
  const [databaseFound, setDatabaseFound] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const appId = useStore(chatStore.currentAppId);

  const handleCheckDatabase = async () => {
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

      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target?.result) {
          setIsModalOpen(false);
          toast.error('Could not read repository contents');
          return;
        }

        const zipContents = event.target.result as string;
        const directoryToFind = 'supabase';

        if (zipContents.includes(directoryToFind)) {
          setDatabaseFound(true);
        } else {
          setDatabaseFound(false);
        }
      };

      reader.readAsText(blob);
    } catch (error) {
      setIsModalOpen(false);
      console.error('Error downloading repository:', error);
      toast.error('Failed to download repository');
    }
  };

  const handleOpenModal = async () => {
    if (!appId) {
      toast.error('No app ID found');
      return;
    }
    setLoadingData(true);
    setIsModalOpen(true);

    await handleCheckDatabase();

    const existingSettings = await database.getAppDeploySettings(appId);
    if (existingSettings) {
      setDeploySettings(existingSettings);
      const lastResult = lastDeployResult(existingSettings);
      if (lastResult?.error) {
        setError(lastResult.error);
      }
    } else {
      setDeploySettings({});
    }

    setLoadingData(false);
    setStatus(DeployStatus.NotStarted);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Don't reset deployment state - let it continue in background
  };

  const generateSiteName = () => {
    const appTitle = chatStore.appTitle.get();
    if (!appTitle) {
      return 'my-app';
    }

    // Convert to lowercase and replace spaces/special characters with hyphens
    const siteName =
      appTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, '') || // Remove leading/trailing hyphens
      'nut-app'; // Fallback if result is empty

    return `${siteName}-${generateRandomId()}`;
  };

  const handleDeploy = async () => {
    setError(undefined);

    if (!appId) {
      setError('No app open');
      return;
    }

    if (deploySettings?.netlify?.authToken || deploySettings?.netlify?.accountSlug) {
      if (!deploySettings.netlify.accountSlug) {
        setError('Netlify account slug is required');
        return;
      } else if (!deploySettings.netlify.authToken) {
        setError('Netlify auth token is required');
        return;
      }
    } else {
      deploySettings.netlify = undefined;
    }

    if (!deploySettings.siteName) {
      deploySettings.siteName = generateSiteName();
    }

    if (
      deploySettings?.supabase?.databaseURL ||
      deploySettings?.supabase?.anonKey ||
      deploySettings?.supabase?.serviceRoleKey ||
      deploySettings?.supabase?.postgresURL
    ) {
      if (!deploySettings.supabase.databaseURL) {
        setError('Supabase Database URL is required');
        return;
      }
      if (!deploySettings.supabase.anonKey) {
        setError('Supabase Anonymous Key is required');
        return;
      }
      if (!deploySettings.supabase.serviceRoleKey) {
        setError('Supabase Service Role Key is required');
        return;
      }
      if (!deploySettings.supabase.postgresURL) {
        setError('Supabase Postgres URL is required');
        return;
      }
    } else {
      deploySettings.supabase = undefined;
    }

    setStatus(DeployStatus.Started);

    // Write out to the database before we start trying to deploy.
    await database.setAppDeploySettings(appId, deploySettings);

    console.log('ManualDeployStarting', appId, deploySettings);

    const result = await deployApp(appId, deploySettings);

    console.log('ManualDeployResult', appId, deploySettings, result);

    if (result.error) {
      setError(result.error);
    }

    setDeploySettings({
      ...deploySettings,
      results: [...(deploySettings.results || []), result],
    });

    setStatus(result.error ? DeployStatus.NotStarted : DeployStatus.Succeeded);
  };

  return (
    <>
      <TooltipProvider>
        <WithTooltip
          tooltip={
            status === DeployStatus.Started
              ? 'Deploying...'
              : status === DeployStatus.Succeeded
                ? 'Deployed'
                : 'Deploy App'
          }
        >
          <button
            className="flex gap-2 bg-blue-500 text-white hover:bg-blue-600 rounded-md p-2 transition-theme"
            onClick={handleOpenModal}
            disabled={status === DeployStatus.Started}
          >
            {status === DeployStatus.Started ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-blue-400 animate-spin" />
              </div>
            ) : status === DeployStatus.Succeeded ? (
              <div className="flex items-center gap-2">
                <div className="i-ph:check text-xl text-green-500"></div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="i-ph:rocket-launch text-xl text-white"></div>
              </div>
            )}
          </button>
        </WithTooltip>
      </TooltipProvider>
      <DeployChatModal
        isModalOpen={isModalOpen}
        setIsModalOpen={handleCloseModal}
        status={status}
        deploySettings={deploySettings}
        setDeploySettings={setDeploySettings}
        error={error}
        handleDeploy={handleDeploy}
        databaseFound={databaseFound}
        loadingData={loadingData}
      />
    </>
  );
}
