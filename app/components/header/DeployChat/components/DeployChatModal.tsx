import { DeployStatus } from '~/components/header/DeployChat/DeployChatButton';
import DeploymentSuccessful from './DeploymentSuccessful';
import type { DeploySettingsDatabase } from '~/lib/replay/Deploy';

interface DeployChatModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  status: DeployStatus;
  deploySettings: DeploySettingsDatabase;
  setDeploySettings: (settings: DeploySettingsDatabase) => void;
  error: string | null;
  handleDeploy: () => void;
  databaseFound: boolean;
}

const DeployChatModal = ({
  isModalOpen,
  setIsModalOpen,
  status,
  deploySettings,
  setDeploySettings,
  error,
  handleDeploy,
  databaseFound,
}: DeployChatModalProps) => {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsModalOpen(false);
    }
  };

  return (
    <>
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 flex items-center justify-center"
          onClick={handleOverlayClick}
        >
          <div
            className="bg-bolt-elements-background-depth-1 rounded-lg p-8 max-w-2xl w-full z-50 border border-bolt-elements-borderColor overflow-y-auto max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {status === DeployStatus.Succeeded ? (
              <DeploymentSuccessful deploySettings={deploySettings} setIsModalOpen={setIsModalOpen} />
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary text-center">
                  Deploy Your Application
                </h2>
                <div className="text-center mb-6 text-bolt-elements-textSecondary">
                  <p className="mb-2">
                    Deploy your chat application to production using Netlify{databaseFound ? ' and Supabase' : ''}.
                  </p>
                  <p className="mb-2">This process will:</p>
                  <div className="flex justify-center">
                    <ul className="text-left list-disc list-inside mb-4 inline-block">
                      <li>Create a new Netlify site or update an existing one</li>
                      {databaseFound && <li>Set up your database with Supabase</li>}
                      <li>Configure all necessary environment variables</li>
                      <li>Deploy your application with production settings</li>
                    </ul>
                  </div>
                  <p className="mb-2">You can leave all fields blank to deploy using default settings.</p>
                </div>

                <div className="mb-8 p-4 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor">
                  <h3 className="text-sm font-medium text-bolt-elements-textPrimary mb-2">Before you begin:</h3>
                  <p className="text-xs text-bolt-elements-textSecondary mb-3 whitespace-pre-wrap">
                    You'll need accounts with {databaseFound ? ' both Netlify and Supabase ' : ' Netlify '}to deploy
                    your application. If you haven't already, please sign up using the links below:
                  </p>
                  <div className="flex flex-col gap-2">
                    <a
                      href="https://app.netlify.com/signup"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-500 hover:text-green-600 transition-colors"
                    >
                      → Sign up for Netlify
                    </a>
                    {databaseFound && (
                      <a
                        href="https://supabase.com/dashboard/sign-up"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-500 hover:text-green-600 transition-colors"
                      >
                        → Sign up for Supabase
                      </a>
                    )}
                  </div>
                </div>

                {deploySettings?.siteURL && (
                  <div className="text-center mb-6">
                    <span className="text-lg text-bolt-elements-textPrimary pr-2">Existing site:</span>
                    <a href={deploySettings?.siteURL} target="_blank" rel="noopener noreferrer">
                      <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium">
                        {deploySettings?.siteURL}
                      </button>
                    </a>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-bolt-elements-textPrimary">
                      Netlify Auth Token
                    </label>
                    <div className="w-full mb-2">
                      <p className="text-xs text-bolt-elements-textSecondary whitespace-pre-wrap">
                        Your personal access token from{' '}
                        <a
                          href="https://app.netlify.com/user/applications#personal-access-tokens"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Netlify user settings
                        </a>
                        . Used to authorize deployments.
                      </p>
                    </div>
                    <input
                      name="netlifyAuthToken"
                      className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={deploySettings?.netlify?.authToken}
                      placeholder="nfp_..."
                      onChange={(e) => {
                        const netlify = {
                          authToken: e.target.value,
                          siteId: deploySettings.netlify?.siteId,
                          accountSlug: deploySettings.netlify?.accountSlug,
                          siteName: deploySettings.netlify?.siteName,
                        };
                        setDeploySettings({
                          ...deploySettings,
                          netlify,
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-bolt-elements-textPrimary">
                      Netlify Site ID (existing site)
                    </label>
                    <div className="w-full mb-2">
                      <p className="text-xs text-bolt-elements-textSecondary whitespace-pre-wrap">
                        The ID of your existing Netlify site if you want to update an existing deployment.
                      </p>
                    </div>
                    <input
                      name="netlifySiteId"
                      className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={deploySettings.netlify?.siteId}
                      placeholder="123e4567-..."
                      onChange={(e) => {
                        const netlify = {
                          authToken: deploySettings.netlify?.authToken,
                          siteId: e.target.value,
                          accountSlug: deploySettings.netlify?.accountSlug,
                          siteName: deploySettings.netlify?.siteName,
                        };
                        setDeploySettings({
                          ...deploySettings,
                          netlify,
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-bolt-elements-textPrimary">
                      Netlify Team Slug (new site)
                    </label>
                    <div className="w-full mb-2">
                      <p className="text-xs text-bolt-elements-textSecondary whitespace-pre-wrap">
                        Your Netlify team slug can be found in the "Team settings" section
                      </p>
                    </div>
                    <input
                      name="netlifyAccountSlug"
                      className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={deploySettings.netlify?.accountSlug}
                      placeholder="abc..."
                      onChange={(e) => {
                        const netlify = {
                          authToken: deploySettings?.netlify?.authToken,
                          siteId: deploySettings?.netlify?.siteId,
                          accountSlug: e.target.value,
                          siteName: deploySettings?.netlify?.siteName,
                        };
                        setDeploySettings({
                          ...deploySettings,
                          netlify,
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-bolt-elements-textPrimary">
                      Netlify Site Name (new site)
                    </label>
                    <div className="w-full mb-2">
                      <p className="text-xs text-bolt-elements-textSecondary whitespace-pre-wrap">
                        The desired name for your new Netlify site. Will be part of your site's URL.
                      </p>
                    </div>
                    <input
                      name="netlifySiteName"
                      className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={deploySettings.netlify?.siteName}
                      placeholder="my-chat-app..."
                      onChange={(e) => {
                        const netlify = {
                          authToken: deploySettings.netlify?.authToken,
                          siteId: deploySettings.netlify?.siteId,
                          accountSlug: deploySettings.netlify?.accountSlug,
                          siteName: e.target.value,
                        };
                        setDeploySettings({
                          ...deploySettings,
                          netlify,
                        });
                      }}
                    />
                  </div>

                  {databaseFound && (
                    <>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-bolt-elements-textPrimary">
                          Supabase Database URL
                        </label>
                        <div className="w-full mb-2">
                          <p className="text-xs text-bolt-elements-textSecondary whitespace-pre-wrap">
                            The URL of your Supabase project, used to connect to your database.
                          </p>
                        </div>
                        <input
                          name="supabaseDatabaseURL"
                          className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          value={deploySettings?.supabase?.databaseURL}
                          placeholder="https://abc...def.supabase.co"
                          onChange={(e) => {
                            const supabase = {
                              databaseURL: e.target.value,
                              anonKey: deploySettings?.supabase?.anonKey || '',
                              serviceRoleKey: deploySettings?.supabase?.serviceRoleKey || '',
                              postgresURL: deploySettings?.supabase?.postgresURL || '',
                            };
                            setDeploySettings({
                              ...deploySettings,
                              supabase,
                            });
                          }}
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-bolt-elements-textPrimary">
                          Supabase Anonymous Key
                        </label>
                        <div className="w-full mb-2">
                          <p className="text-xs text-bolt-elements-textSecondary whitespace-pre-wrap">
                            Public API key for client-side database access with restricted permissions.
                          </p>
                        </div>
                        <input
                          name="supabaseAnonKey"
                          className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          value={deploySettings?.supabase?.anonKey}
                          placeholder="ey..."
                          onChange={(e) => {
                            const supabase = {
                              databaseURL: deploySettings?.supabase?.databaseURL || '',
                              anonKey: e.target.value,
                              serviceRoleKey: deploySettings?.supabase?.serviceRoleKey || '',
                              postgresURL: deploySettings?.supabase?.postgresURL || '',
                            };
                            setDeploySettings({
                              ...deploySettings,
                              supabase,
                            });
                          }}
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-bolt-elements-textPrimary">
                          Supabase Service Role Key
                        </label>
                        <div className="w-full mb-2">
                          <p className="text-xs text-bolt-elements-textSecondary whitespace-pre-wrap">
                            Admin API key for server-side operations with full database access.
                          </p>
                        </div>
                        <input
                          name="supabaseServiceRoleKey"
                          className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          value={deploySettings?.supabase?.serviceRoleKey}
                          placeholder="ey..."
                          onChange={(e) => {
                            const supabase = {
                              databaseURL: deploySettings?.supabase?.databaseURL || '',
                              anonKey: deploySettings?.supabase?.anonKey || '',
                              serviceRoleKey: e.target.value,
                              postgresURL: deploySettings?.supabase?.postgresURL || '',
                            };
                            setDeploySettings({
                              ...deploySettings,
                              supabase,
                            });
                          }}
                        />
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-bolt-elements-textPrimary">
                          Supabase Postgres URL
                        </label>
                        <div className="w-full mb-2">
                          <p className="text-xs text-bolt-elements-textSecondary whitespace-pre-wrap">
                            Direct connection URL to your Postgres database for advanced operations.
                          </p>
                        </div>
                        <input
                          name="supabasePostgresURL"
                          className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          value={deploySettings?.supabase?.postgresURL}
                          placeholder="postgresql://postgres:<password>@db.abc...def.supabase.co:5432/postgres"
                          onChange={(e) => {
                            const supabase = {
                              databaseURL: deploySettings?.supabase?.databaseURL || '',
                              anonKey: deploySettings?.supabase?.anonKey || '',
                              serviceRoleKey: deploySettings?.supabase?.serviceRoleKey || '',
                              postgresURL: e.target.value,
                            };
                            setDeploySettings({
                              ...deploySettings,
                              supabase,
                            });
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-center gap-3">
                  {status === DeployStatus.Started ? (
                    <div className="w-full text-bolt-elements-textSecondary flex items-center justify-center">
                      <span className="i-svg-spinners:3-dots-fade inline-block w-[1em] h-[1em] mr-2 text-4xl"></span>
                      <span>Deploying your application...</span>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handleDeploy}
                        className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                      >
                        Deploy
                      </button>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-3 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>

                {error && (
                  <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    <p className="font-medium mb-1">Deployment Error</p>
                    <p>{error}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DeployChatModal;
