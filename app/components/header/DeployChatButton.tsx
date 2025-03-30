import { toast } from 'react-toastify';
import ReactModal from 'react-modal';
import { useState } from 'react';
import type { DeploySettingsDatabase } from '~/lib/replay/Deploy';
import { generateRandomId } from '~/lib/replay/ReplayProtocolClient';
import { workbenchStore } from '~/lib/stores/workbench';
import { databaseGetChatDeploySettings, databaseUpdateChatDeploySettings } from '~/lib/persistence/db';
import { currentChatId } from '~/lib/persistence/useChatHistory';
import { deployRepository } from '~/lib/replay/Deploy';

ReactModal.setAppElement('#root');

// Component for deploying a chat to production.

export function DeployChatButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deploySettings, setDeploySettings] = useState<DeploySettingsDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Whether the new deployment finished.
  const [deployed, setDeployed] = useState<boolean>(false);

  const handleOpenModal = async () => {
    const chatId = currentChatId.get();
    if (!chatId) {
      toast.error('No chat open');
      return;
    }

    const existingSettings = await databaseGetChatDeploySettings(chatId);

    setIsModalOpen(true);
    setDeployed(false);

    if (existingSettings) {
      setDeploySettings(existingSettings);
    } else {
      setDeploySettings({});
    }
  };

  const handleDeploy = async () => {
    const chatId = currentChatId.get();
    if (!chatId) {
      toast.error('No chat open');
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
    }

    if (deploySettings?.supabase?.databaseURL || deploySettings?.supabase?.anonKey || deploySettings?.supabase?.postgresURL) {
      if (!deploySettings.supabase.databaseURL) {
        setError('Supabase Database URL is required');
        return;
      }
      if (!deploySettings.supabase.anonKey) {
        setError('Supabase Anonymous Key is required');
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

    toast.info('Starting deployment...');

    // Write out to the database before we start trying to deploy.
    await databaseUpdateChatDeploySettings(chatId, deploySettings);

    const result = await deployRepository(repositoryId, deploySettings);
    if (result.error) {
      setError(result.error);
      return;
    }

    setDeployed(true);
    toast.success('Deployment succeeded!');

    let newSettings = deploySettings;

    // Update netlify settings so future deployments will reuse the site.
    if (deploySettings?.netlify?.createInfo && result.netlifySiteId) {
      newSettings = {
        ...deploySettings,
        netlify: { siteId: result.netlifySiteId },
      };
    }

    // Update database with the deployment result.
    newSettings = {
      ...newSettings,
      siteURL: result.siteURL,
      repositoryId,
    };

    // Update the database with the new settings.
    await databaseUpdateChatDeploySettings(chatId, newSettings);

    setDeploySettings(newSettings);
  };

  return (
    <>
      <button
        className="flex gap-2 bg-bolt-elements-sidebar-buttonBackgroundDefault text-bolt-elements-sidebar-buttonText hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded-md p-2 transition-theme"
        onClick={() => {
          handleOpenModal();
        }}
      >
        Deploy
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full z-50">
            {deployed ? (
              <>
                <div className="text-center mb-2">Deployed Succeeded</div>
                <div className="text-center">
                  <div className="flex justify-center gap-2 mt-4">
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                      }}
                      className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-center mb-4">Deploy</h2>
                <div className="text-center mb-4">
                  Deploy this chat's project to production.
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 items-center">
                  <label className="text-sm font-lg text-gray-700 text-right">Netlify Site ID (existing site):</label>
                  <input
                    name="netlifySiteId"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
                    value={deploySettings?.netlify?.siteId}
                    placeholder="123e4567-..."
                    onChange={(e) => {
                      setDeploySettings({
                        ...deploySettings,
                        netlify: { ...deploySettings?.netlify, siteId: e.target.value },
                      });
                    }}
                  />
                  <label className="text-sm font-lg text-gray-700 text-right">Netlify Account Slug (new site):</label>
                  <input
                    name="netlifyAccountSlug"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
                    value={deploySettings?.netlify?.createInfo?.accountSlug}
                    placeholder="abc..."
                    onChange={(e) => {
                      const createInfo = {
                        accountSlug: e.target.value,
                        siteName: deploySettings?.netlify?.createInfo?.siteName || '',
                      };
                      setDeploySettings({
                        ...deploySettings,
                        netlify: { ...deploySettings?.netlify, createInfo },
                      });
                    }}
                  />
                  <label className="text-sm font-lg text-gray-700 text-right">Netlify Site Name (new site):</label>
                  <input
                    name="netlifySiteName"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
                    value={deploySettings?.netlify?.createInfo?.siteName}
                    placeholder="my-chat-app..."
                    onChange={(e) => {
                      const createInfo = {
                        accountSlug: deploySettings?.netlify?.createInfo?.accountSlug || '',
                        siteName: e.target.value,
                      };
                      setDeploySettings({
                        ...deploySettings,
                        netlify: { ...deploySettings?.netlify, createInfo },
                      });
                    }}
                  />
                  <label className="text-sm font-lg text-gray-700 text-right">Supabase Database URL:</label>
                  <input
                    name="supabaseDatabaseURL"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
                    value={deploySettings?.supabase?.databaseURL}
                    placeholder="https://abc...def.supabase.co"
                    onChange={(e) => {
                      const supabase = {
                        databaseURL: e.target.value,
                        anonKey: deploySettings?.supabase?.anonKey || '',
                        postgresURL: deploySettings?.supabase?.postgresURL || '',
                      };
                      setDeploySettings({
                        ...deploySettings,
                        supabase,
                      });
                    }}
                  />
                  <label className="text-sm font-lg text-gray-700 text-right">Supabase Anonymous Key:</label>
                  <input
                    name="supabaseAnonKey"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
                    value={deploySettings?.supabase?.anonKey}
                    placeholder="ey..."
                    onChange={(e) => {
                      const supabase = {
                        databaseURL: deploySettings?.supabase?.databaseURL || '',
                        anonKey: e.target.value,
                        postgresURL: deploySettings?.supabase?.postgresURL || '',
                      };
                      setDeploySettings({
                        ...deploySettings,
                        supabase,
                      });
                    }}
                  />
                  <label className="text-sm font-lg text-gray-700 text-right">Supabase Postgres URL:</label>
                  <input
                    name="supabasePostgresURL"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
                    value={deploySettings?.supabase?.postgresURL}
                    placeholder="postgresql://postgres:<password>@db.abc...def.supabase.co:5432/postgres"
                    onChange={(e) => {
                      const supabase = {
                        databaseURL: deploySettings?.supabase?.databaseURL || '',
                        anonKey: deploySettings?.supabase?.anonKey || '',
                        postgresURL: e.target.value,
                      };
                      setDeploySettings({
                        ...deploySettings,
                        supabase,
                      });
                    }}
                  />
                </div>

                <div className="flex justify-center gap-2 mt-4">
                  <button
                    onClick={handleDeploy}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    Deploy
                  </button>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                    }}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
