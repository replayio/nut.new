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

// Restriction from Netlify on how long site names can be.
const MAX_SITE_NAME_LENGTH = 63;

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
    let siteName =
      appTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, '') || // Remove leading/trailing hyphens
      'nut-app'; // Fallback if result is empty

    const suffix = `-${generateRandomId()}`;

    // Shorten if necessary to ensure names are under the Netlify limit.
    siteName = siteName.slice(0, MAX_SITE_NAME_LENGTH - suffix.length);

    return `${siteName}${suffix}`;
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

    if (deploySettings.siteName.length > MAX_SITE_NAME_LENGTH) {
      setError(`Site name must be shorter than ${MAX_SITE_NAME_LENGTH + 1} characters`);
      return;
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

    const result = await deployApp(appId, deploySettings);

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
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl p-2.5 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 hover:border-white/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 group"
            onClick={handleOpenModal}
            disabled={status === DeployStatus.Started}
          >
            {status === DeployStatus.Started ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : status === DeployStatus.Succeeded ? (
              <div className="i-ph:check text-green-500 text-xl drop-shadow-sm transition-transform duration-200 group-hover:scale-110"></div>
            ) : (
              <div className="i-ph:rocket-launch text-xl text-white drop-shadow-sm transition-transform duration-200 group-hover:scale-110"></div>
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
