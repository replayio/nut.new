import { toast } from 'react-toastify';
import ReactModal from 'react-modal';
import { useState } from 'react';
import type { DeploySettingsDatabase } from '~/lib/replay/Deploy';
import { workbenchStore } from '~/lib/stores/workbench';
import { chatStore } from '~/lib/stores/chat';
import { database } from '~/lib/persistence/apps';
import { deployApp, downloadRepository } from '~/lib/replay/Deploy';
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
  const [deploySettings, setDeploySettings] = useState<DeploySettingsDatabase>({});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<DeployStatus>(DeployStatus.NotStarted);
  const [databaseFound, setDatabaseFound] = useState(false);

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
    const appId = chatStore.currentAppId.get();
    if (!appId) {
      toast.error('No app ID found');
      return;
    }

    await handleCheckDatabase();
    const existingSettings = await database.getAppDeploySettings(appId);

    setIsModalOpen(true);
    setStatus(DeployStatus.NotStarted);

    if (existingSettings) {
      setDeploySettings(existingSettings);
    } else {
      setDeploySettings({});
    }
  };

  const generateSiteName = () => {
    const appTitle = chatStore.appTitle.get();
    if (!appTitle) {
      return 'my-app';
    }
    
    // Convert to lowercase and replace spaces/special characters with hyphens
    const siteName = appTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      || 'nut-app'; // Fallback if result is empty

    return `${siteName}-${generateRandomId()}`;
  };

  const handleDeploy = async () => {
    setError(null);

    const appId = chatStore.currentAppId.get();
    if (!appId) {
      setError('No app open');
      return;
    }

    if (!deploySettings.netlify) {
      deploySettings.netlify = {};
    }

    const { authToken, siteId, accountSlug, siteName } = deploySettings.netlify;
    if (siteId && accountSlug) {
      setError('Cannot specify both a Netlify Site ID and a Netlify Account Slug');
      return;
    } else if (!siteId && !accountSlug) {
      setError('Either a Netlify Site ID or a Netlify Account Slug is required');
      return;
    } else if (authToken && !accountSlug) {
      setError('An account slug is required when using an auth token');
      return;
    } else if (accountSlug && !authToken) {
      setError('An auth token is required when using an account slug');
      return;
    }

    if (!siteId && !siteName) {
      deploySettings.netlify.siteName = generateSiteName();
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
    }

    setStatus(DeployStatus.Started);

    // Write out to the database before we start trying to deploy.
    await database.setAppDeploySettings(appId, deploySettings);

    console.log('DeploymentStarting', appId, deploySettings);

    const result = await deployApp(appId, deploySettings);

    console.log('DeploymentResult', appId, deploySettings, result);

    if (result.error) {
      setStatus(DeployStatus.NotStarted);
      setError(result.error);
      return;
    }

    let newSettings = deploySettings;

    // Update netlify settings so future deployments will reuse the site.
    if (result.netlifySiteId) {
      newSettings = {
        ...deploySettings,
        netlify: {
          authToken: deploySettings.netlify?.authToken,
          siteId: result.netlifySiteId,
        },
      };
    }

    // Update database with the deployment result.
    newSettings = {
      ...newSettings,
      siteURL: result.siteURL,
    };

    setDeploySettings(newSettings);
    setStatus(DeployStatus.Succeeded);

    // Update the database with the new settings.
    await database.setAppDeploySettings(appId, newSettings);
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
