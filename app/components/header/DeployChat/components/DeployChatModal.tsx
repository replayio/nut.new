import { useState } from 'react';
import { DeployStatus } from '~/components/header/DeployChat/DeployChatButton';
import DeploymentSuccessful from './DeploymentSuccessful';
import { lastDeployResult, type DeploySettings, type DeploySettingsNetlify } from '~/lib/replay/Deploy';

interface DeployChatModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  status: DeployStatus;
  deploySettings: DeploySettings;
  setDeploySettings: (settings: DeploySettings) => void;
  error: string | undefined;
  handleDeploy: () => void;
  databaseFound: boolean;
  loadingData: boolean;
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
  loadingData,
}: DeployChatModalProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsModalOpen(false);
    }
  };

  const isDeploying = status === DeployStatus.Started;
  const result = lastDeployResult(deploySettings);
  const hasExistingSite = Boolean(
    result?.siteURL || deploySettings?.netlify?.authToken || deploySettings?.netlify?.accountSlug,
  );

  if (loadingData) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
        onClick={handleOverlayClick}
      >
        <div
          className="bg-bolt-elements-background-depth-1 rounded-xl p-12 max-w-md w-full z-50 border border-bolt-elements-borderColor shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <div className="mb-6">
              <div className="w-12 h-12 rounded-full border-4 border-bolt-elements-borderColor border-t-blue-500 animate-spin mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-bolt-elements-textPrimary mb-2">Loading data...</h3>
            <p className="text-sm text-bolt-elements-textSecondary">
              Please wait while we prepare your deployment settings
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
          onClick={handleOverlayClick}
        >
          <div
            className="bg-bolt-elements-background-depth-1 rounded-lg p-6 max-w-2xl w-full z-50 border border-bolt-elements-borderColor overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {status === DeployStatus.Succeeded ? (
              <DeploymentSuccessful result={result} setIsModalOpen={setIsModalOpen} />
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary text-center">
                  Deploy Your Application
                </h2>

                {/* Easy Deploy Section */}
                <div className="mb-6 p-6 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor">
                  <h3 className="text-lg font-semibold text-bolt-elements-textPrimary mb-3 flex items-center justify-center gap-2">
                    <span>⚡</span>
                    Quick Deploy
                  </h3>
                  <p className="text-sm text-bolt-elements-textSecondary mb-4 text-center w-full whitespace-pre-wrap">
                    Deploy instantly with smart defaults. No configuration needed - we'll handle everything for you
                    {databaseFound ? ', including database setup' : ''}.
                  </p>

                  {/* Show existing site in easy deploy */}
                  {hasExistingSite && (
                    <div className="mb-4 p-3 bg-bolt-elements-background-depth-3 rounded-lg border border-bolt-elements-borderColor">
                      <div className="flex flex-col items-center justify-between">
                        <div className="text-sm text-bolt-elements-textPrimary font-medium">Your App's URL:</div>
                        {result?.siteURL ? (
                          <a
                            href={result.siteURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-green-500 hover:text-green-600 transition-colors underline truncate"
                          >
                            {result.siteURL}
                          </a>
                        ) : (
                          <span className="text-sm text-bolt-elements-textSecondary">Existing deployment found</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center">
                    {isDeploying ? (
                      <div className="w-full text-bolt-elements-textSecondary flex items-center justify-center py-3">
                        <div className="w-5 h-5 rounded-full border-2 border-bolt-elements-borderColor border-t-blue-500 animate-spin mr-2" />
                        <span className="text-lg">{hasExistingSite ? 'Redeploying' : 'Deploying'} your app...</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleDeploy}
                        disabled={isDeploying}
                        className="flex items-center gap-2 px-8 py-3 bg-blue-500 text-white text-lg font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <div className="i-ph:rocket-launch text-xl"></div>
                        {hasExistingSite ? 'Redeploy' : 'Deploy Now'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Advanced Settings Section */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    disabled={isDeploying}
                    className={`w-full flex items-center justify-between p-4 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor hover:bg-bolt-elements-background-depth-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      showAdvanced ? 'rounded-t-lg border-b-0' : 'rounded-lg'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-bolt-elements-textPrimary font-medium">Advanced Settings</span>
                      <span className="text-xs text-bolt-elements-textSecondary">
                        (Custom Netlify & Supabase credentials)
                      </span>
                    </div>
                    <span
                      className={`text-bolt-elements-textSecondary transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                    >
                      <div className="i-ph:caret-down text-bolt-elements-textPrimary text-base font-bold" />
                    </span>
                  </button>

                  {showAdvanced && (
                    <div className="bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor border-t-0 rounded-b-lg">
                      <div className="p-6">
                        <div className="mb-6 p-4 bg-bolt-elements-background-depth-3 rounded-lg border border-bolt-elements-borderColor">
                          <h3 className="text-sm font-medium text-bolt-elements-textPrimary mb-2">Before you begin:</h3>
                          <p className="text-xs text-bolt-elements-textSecondary mb-3">
                            You'll need accounts with {databaseFound ? 'both Netlify and Supabase' : 'Netlify'} to
                            deploy with custom settings.
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          {/* Netlify Fields */}
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
                                  className="text-green-500 hover:text-green-600"
                                >
                                  Netlify user settings
                                </a>
                                . Used to authorize deployments.
                              </p>
                            </div>
                            <input
                              name="netlifyAuthToken"
                              className="w-full p-3 border rounded-lg bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              value={deploySettings?.netlify?.authToken || ''}
                              placeholder="nfp_..."
                              onChange={(e) => {
                                const netlify: DeploySettingsNetlify = {
                                  authToken: e.target.value,
                                  accountSlug: deploySettings.netlify?.accountSlug ?? '',
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
                              value={deploySettings.netlify?.accountSlug || ''}
                              placeholder="abc..."
                              onChange={(e) => {
                                const netlify: DeploySettingsNetlify = {
                                  authToken: deploySettings.netlify?.authToken ?? '',
                                  accountSlug: e.target.value,
                                };
                                setDeploySettings({
                                  ...deploySettings,
                                  netlify,
                                });
                              }}
                            />
                          </div>

                          <div className="md:col-span-2">
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
                              value={deploySettings.siteName || ''}
                              placeholder="my-chat-app..."
                              onChange={(e) => {
                                setDeploySettings({
                                  ...deploySettings,
                                  siteName: e.target.value,
                                });
                              }}
                            />
                          </div>

                          {/* Supabase Fields */}
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
                                  value={deploySettings?.supabase?.databaseURL || ''}
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
                                  value={deploySettings?.supabase?.anonKey || ''}
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
                                  value={deploySettings?.supabase?.serviceRoleKey || ''}
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
                                  value={deploySettings?.supabase?.postgresURL || ''}
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

                        <div className="flex justify-center">
                          {isDeploying ? (
                            <div className="w-full text-bolt-elements-textSecondary flex items-center justify-center py-3">
                              <span className="i-svg-spinners:3-dots-fade inline-block w-[1.2em] h-[1.2em] mr-3 text-2xl"></span>
                              <span className="text-lg">Deploying with custom settings...</span>
                            </div>
                          ) : (
                            <button
                              onClick={handleDeploy}
                              disabled={isDeploying}
                              className="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Deploy with Custom Settings
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    disabled={isDeploying}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>

                {error && (
                  <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
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
