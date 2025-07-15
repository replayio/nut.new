import { toast } from 'react-toastify';
import ReactModal from 'react-modal';
import { useState } from 'react';
import type { DeploySettingsDatabase } from '~/lib/replay/Deploy';
import { generateRandomId } from '~/lib/replay/ReplayProtocolClient';
import { workbenchStore } from '~/lib/stores/workbench';
import { chatStore } from '~/lib/stores/chat';
import { database } from '~/lib/persistence/chats';
import { deployRepository, downloadRepository } from '~/lib/replay/Deploy';
import DeployChatModal from './components/DeployChatModal';

ReactModal.setAppElement('#root');

export enum DeployStatus {
  NotStarted,
  Started,
  Succeeded,
}

export function DeployChatButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deploySettings, setDeploySettings] = useState<DeploySettingsDatabase | null>(null);
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
    const chatId = chatStore.currentChat.get()?.id;
    if (!chatId) {
      toast.error('No chat ID found');
      return;
    }

    await handleCheckDatabase();
    const existingSettings = await database.getChatDeploySettings(chatId);

    setIsModalOpen(true);
    setStatus(DeployStatus.NotStarted);

    if (existingSettings) {
      setDeploySettings(existingSettings);
    } else {
      setDeploySettings({});
    }
  };

  const handleDeploy = async () => {
    setError(null);

    const chatId = chatStore.currentChat.get()?.id;
    if (!chatId) {
      setError('No chat open');
      return;
    }

    if (!deploySettings?.netlify?.authToken) {
      setError('Netlify Auth Token is required');
      return;
    }

    if (deploySettings?.netlify?.siteId) {
      if (deploySettings.netlify.createInfo) {
        setError('Cannot specify both a Netlify Site ID and a Netlify Account Slug');
        return;
      }
    } else if (!deploySettings?.netlify?.createInfo) {
      setError('Either a Netlify Site ID or a Netlify Account Slug is required');
      return;
    } else {
      // Add a default site name if one isn't provided.
      if (!deploySettings.netlify.createInfo?.siteName) {
        deploySettings.netlify.createInfo.siteName = `nut-app-${generateRandomId()}`;
      }
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

    const repositoryId = workbenchStore.repositoryId.get();
    if (!repositoryId) {
      setError('No repository ID found');
      return;
    }

    setStatus(DeployStatus.Started);

    // Write out to the database before we start trying to deploy.
    await database.updateChatDeploySettings(chatId, deploySettings);

    console.log('DeploymentStarting', repositoryId, deploySettings);

    const result = await deployRepository(repositoryId, deploySettings);

    console.log('DeploymentResult', repositoryId, deploySettings, result);

    if (result.error) {
      setStatus(DeployStatus.NotStarted);
      setError(result.error);
      return;
    }

    let newSettings = deploySettings;

    // Update netlify settings so future deployments will reuse the site.
    if (deploySettings?.netlify?.createInfo && result.netlifySiteId) {
      newSettings = {
        ...deploySettings,
        netlify: { authToken: deploySettings.netlify.authToken, siteId: result.netlifySiteId },
      };
    }

    // Update database with the deployment result.
    newSettings = {
      ...newSettings,
      siteURL: result.siteURL,
      repositoryId,
    };

    setDeploySettings(newSettings);
    setStatus(DeployStatus.Succeeded);

    // Update the database with the new settings.
    await database.updateChatDeploySettings(chatId, newSettings);
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
