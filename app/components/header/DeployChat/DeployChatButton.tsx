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

    setIsModalOpen(true);
    setStatus(DeployStatus.NotStarted);
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

    console.log('DeploymentStarting', appId, deploySettings);

    const result = await deployApp(appId, deploySettings);

    console.log('DeploymentResult', appId, deploySettings, result);

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
      <button
        className="flex gap-2 bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded-md p-2 transition-theme"
        onClick={handleOpenModal}
      >
        Deploy App
      </button>
      <DeployChatModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        status={status}
        deploySettings={deploySettings}
        setDeploySettings={setDeploySettings}
        error={error}
        handleDeploy={handleDeploy}
        databaseFound={databaseFound}
      />
    </>
  );
}
