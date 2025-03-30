import { toast } from 'react-toastify';
import ReactModal from 'react-modal';
import { useState } from 'react';
import { submitFeedback } from '~/lib/replay/Problems';
import { getLastChatMessages } from '~/components/chat/Chat.client';
import type { DeploySettings } from '~/lib/replay/Deploy';
import { generateRandomId } from '~/lib/replay/ReplayProtocolClient';
import { workbenchStore } from '~/lib/stores/workbench';

ReactModal.setAppElement('#root');

// Component for deploying a chat to production.

export function DeployChatButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    netlifySiteId: '',
    netlifyAccountSlug: '',
    netlifySiteName: '',
    supabaseDatabaseURL: '',
    supabaseAnonKey: '',
    supabasePostgresURL: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [deployed, setDeployed] = useState<boolean>(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setFormData({
      netlifySiteId: '',
      netlifyAccountSlug: '',
      netlifySiteName: '',
      supabaseDatabaseURL: '',
      supabaseAnonKey: '',
      supabasePostgresURL: '',
    });
    setDeployed(false);
  };

  const handleDeploy = async () => {
    const settings: DeploySettings = {};

    if (formData.netlifySiteId) {
      if (formData.netlifyAccountSlug) {
        setError('Cannot specify both a Netlify Site ID and a Netlify Account Slug');
        return;
      }
      settings.netlify = {
        siteId: formData.netlifySiteId,
      };
    } else if (formData.netlifyAccountSlug) {
      const siteName = formData.netlifySiteName || `nut-site-${generateRandomId()}`;
      settings.netlify = {
        createInfo: {
          accountSlug: formData.netlifyAccountSlug,
          siteName,
        },
      };
    }

    if (formData.supabaseDatabaseURL || formData.supabaseAnonKey || formData.supabasePostgresURL) {
      if (!formData.supabaseDatabaseURL) {
        setError('Supabase Database URL is required');
        return;
      }
      if (!formData.supabaseAnonKey) {
        setError('Supabase Anonymous Key is required');
        return;
      }
      if (!formData.supabasePostgresURL) {
        setError('Supabase Postgres URL is required');
        return;
      }
      settings.supabase = {
        databaseURL: formData.supabaseDatabaseURL,
        anonKey: formData.supabaseAnonKey,
        postgresURL: formData.supabasePostgresURL,
      };
    }

    const repositoryId = workbenchStore.repositoryId.get();
    if (!repositoryId) {
      setError('No repository ID found');
      return;
    }

    toast.info('Starting deployment...');

    const result = await deployRepository(repositoryId, settings);
    if (result.error) {
      setError(result.error);
      return;
    }

    setDeployed(true);
    toast.success('Deployment succeeded!');

    export interface DeployResult {
      error?: string;
      netlifySiteId?: string;
      siteURL?: string;
    }
    
    export async function deployRepository(repositoryId: string, settings: DeploySettings): Promise<DeployResult> {
    

    console.log("DEPLOY", formData);
    /*
    if (!formData.netlifySiteId) {
      toast.error('Please fill in the Netlify Site ID field');

      return;
    }


    const feedbackData: any = {
      description: formData.description,
      share: formData.share,
      source: 'feedback_modal',
    };

    if (feedbackData.share) {
      feedbackData.chatMessages = getLastChatMessages();
    }

    try {
      const success = await submitFeedback(feedbackData);

      if (success) {
        setSubmitted(true);
        toast.success('Feedback submitted successfully!');
      } else {
        toast.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('An error occurred while submitting feedback');
    }
    */
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
                    value={formData.netlifySiteId}
                    placeholder="123e4567-..."
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        netlifySiteId: e.target.value,
                      }));
                    }}
                  />
                  <label className="text-sm font-lg text-gray-700 text-right">Netlify Account Slug (new site):</label>
                  <input
                    name="netlifyAccountSlug"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
                    value={formData.netlifyAccountSlug}
                    placeholder="abc..."
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        netlifyAccountSlug: e.target.value,
                      }));
                    }}
                  />
                  <label className="text-sm font-lg text-gray-700 text-right">Netlify Site Name (new site):</label>
                  <input
                    name="netlifySiteName"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
                    value={formData.netlifySiteName}
                    placeholder="my-chat-app..."
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        netlifySiteName: e.target.value,
                      }));
                    }}
                  />
                  <label className="text-sm font-lg text-gray-700 text-right">Supabase Database URL:</label>
                  <input
                    name="supabaseDatabaseURL"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
                    value={formData.supabaseDatabaseURL}
                    placeholder="https://abc...def.supabase.co"
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        supabaseDatabaseURL: e.target.value,
                      }));
                    }}
                  />
                  <label className="text-sm font-lg text-gray-700 text-right">Supabase Anonymous Key:</label>
                  <input
                    name="supabaseAnonKey"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
                    value={formData.supabaseAnonKey}
                    placeholder="ey..."
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        supabaseAnonKey: e.target.value,
                      }));
                    }}
                  />
                  <label className="text-sm font-lg text-gray-700 text-right">Supabase Postgres URL:</label>
                  <input
                    name="supabasePostgresURL"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
                    value={formData.supabasePostgresURL}
                    placeholder="postgresql://postgres:<password>@db.abc...def.supabase.co:5432/postgres"
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        supabasePostgresURL: e.target.value,
                      }));
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
