import { toast } from 'react-toastify';
import ReactModal from 'react-modal';
import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
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

export enum DeployType {
  None,
  Easy,
  Manual,
}

export function DeployChatButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deploySettings, setDeploySettings] = useState<DeploySettingsDatabase>({});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<DeployStatus>(DeployStatus.NotStarted);
  const [deployType, setDeployType] = useState<DeployType>(DeployType.None);
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

    setIsModalOpen(true);
    
    // Only reset states if not currently deploying
    if (status !== DeployStatus.Started) {
      setStatus(DeployStatus.NotStarted);
      setDeployType(DeployType.None);
      setError(null);
    }

    if (existingSettings) {
      setDeploySettings(existingSettings);
    } else {
      setDeploySettings({});
    }
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

  const handleEasyDeploy = async () => {
    setError(null);
    setDeployType(DeployType.Easy);

    if (!appId) {
      setError('No app open');
      return;
    }

    // For easy deploy, reuse existing settings if available, otherwise use minimal settings
    const easyDeploySettings: DeploySettingsDatabase = {
      netlify: {
        // Reuse existing credentials if available
        authToken: deploySettings?.netlify?.authToken,
        siteId: deploySettings?.netlify?.siteId,
        // Only generate new site name if no existing site
        siteName: deploySettings?.netlify?.siteName || generateSiteName(),
      },
    };

    setStatus(DeployStatus.Started);

    // Write settings to database
    await database.setAppDeploySettings(appId, easyDeploySettings);

    console.log('EasyDeployStarting', appId, easyDeploySettings);

    const result = await deployApp(appId, easyDeploySettings);

    console.log('EasyDeployResult', appId, easyDeploySettings, result);

    if (result.error) {
      setStatus(DeployStatus.NotStarted);
      setDeployType(DeployType.None);
      setError(result.error);
      return;
    }

    // Update settings with deployment result
    const newSettings: DeploySettingsDatabase = {
      ...easyDeploySettings,
      siteURL: result.siteURL,
      netlify: {
        ...easyDeploySettings.netlify,
        siteId: result.netlifySiteId || easyDeploySettings.netlify?.siteId,
      },
    };

    setDeploySettings(newSettings);
    setStatus(DeployStatus.Succeeded);

    // Update the database with the new settings
    await database.setAppDeploySettings(appId, newSettings);
  };

  const handleManualDeploy = async () => {
    setError(null);
    setDeployType(DeployType.Manual);

    if (!appId) {
      setError('No app open');
      return;
    }

    if (!deploySettings.netlify) {
      deploySettings.netlify = {};
    }

    // Normalize empty strings to undefined.
    if (deploySettings.netlify.authToken?.length === 0) {
      deploySettings.netlify.authToken = undefined;
    }
    if (deploySettings.netlify.siteId?.length === 0) {
      deploySettings.netlify.siteId = undefined;
    }
    if (deploySettings.netlify.accountSlug?.length === 0) {
      deploySettings.netlify.accountSlug = undefined;
    }
    if (deploySettings.netlify.siteName?.length === 0) {
      deploySettings.netlify.siteName = undefined;
    }

    const { authToken, siteId, accountSlug, siteName } = deploySettings.netlify;
    if (siteId && accountSlug) {
      setError('Cannot specify both a Netlify Site ID and a Netlify Account Slug');
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

    console.log('ManualDeployStarting', appId, deploySettings);

    const result = await deployApp(appId, deploySettings);

    console.log('ManualDeployResult', appId, deploySettings, result);

    if (result.error) {
      setStatus(DeployStatus.NotStarted);
      setDeployType(DeployType.None);
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
        disabled={status === DeployStatus.Started}
      >
        {status === DeployStatus.Started ? (
          <>
            <span className="i-svg-spinners:3-dots-fade inline-block w-[1em] h-[1em]"></span>
            Deploying...
          </>
        ) : status === DeployStatus.Succeeded ? (
          <div className="flex items-center gap-2">
            <div className="i-ph:check-circle text-xl"></div>
            Deployed
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="i-ph:rocket-launch text-xl"></div>
            Deploy App
          </div>
        )}
      </button>
      <DeployChatModal
        isModalOpen={isModalOpen}
        setIsModalOpen={handleCloseModal}
        status={status}
        deployType={deployType}
        deploySettings={deploySettings}
        setDeploySettings={setDeploySettings}
        error={error}
        handleEasyDeploy={handleEasyDeploy}
        handleManualDeploy={handleManualDeploy}
        databaseFound={databaseFound}
      />
    </>
  );
}
