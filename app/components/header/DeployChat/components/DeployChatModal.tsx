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
          className="bg-bolt-elements-background-depth-1 rounded-2xl p-8 max-w-md w-full z-50 border border-bolt-elements-borderColor/50 shadow-2xl hover:shadow-3xl transition-shadow duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-lg">
              <div className="w-8 h-8 border-2 border-bolt-elements-borderColor/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
            <h3 className="text-2xl font-bold text-bolt-elements-textHeading mb-3">Loading data...</h3>
            <p className="text-bolt-elements-textSecondary">Please wait while we prepare your deployment settings</p>
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
            className="bg-bolt-elements-background-depth-1 rounded-2xl p-6 max-w-2xl w-full z-50 border border-bolt-elements-borderColor/50 overflow-y-auto max-h-[90vh] shadow-2xl hover:shadow-3xl transition-shadow duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              disabled={isDeploying}
              className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor hover:bg-bolt-elements-background-depth-3 transition-all duration-200 flex items-center justify-center text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary shadow-sm hover:shadow-md hover:scale-105 group disabled:opacity-50"
            >
              <div className="i-ph:x text-lg transition-transform duration-200 group-hover:scale-110" />
            </button>

            {status === DeployStatus.Succeeded ? (
              <DeploymentSuccessful result={result} setIsModalOpen={setIsModalOpen} />
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20 shadow-lg">
                    <div className="i-ph:rocket-launch text-2xl text-blue-500" />
                  </div>
                  <h2 className="text-3xl font-bold text-bolt-elements-textHeading mb-2">Deploy Your Application</h2>
                  <p className="text-bolt-elements-textSecondary">Get your app live on the web in just a few clicks</p>
                </div>

                {/* Easy Deploy Section */}
                <div className="mb-8 p-6 bg-bolt-elements-background-depth-2/50 rounded-2xl border border-bolt-elements-borderColor/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="text-2xl">⚡</span>
                      <h3 className="text-xl font-bold text-bolt-elements-textHeading">Quick Deploy</h3>
                    </div>
                    <p className="text-bolt-elements-textSecondary leading-relaxed">
                      Deploy instantly with smart defaults. No configuration needed - we'll handle everything for you
                      {databaseFound ? ', including database setup' : ''}.
                    </p>
                  </div>

                  {/* Show existing site in easy deploy */}
                  {hasExistingSite && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20 shadow-sm">
                      <div className="flex flex-col items-center justify-between gap-2">
                        <div className="text-sm text-green-700 font-semibold flex items-center gap-2">
                          <div className="i-ph:check-circle text-lg text-green-500" />
                          Your App's URL:
                        </div>
                        {result?.siteURL ? (
                          <a
                            href={result.siteURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-green-600 hover:text-green-700 transition-colors underline truncate font-medium"
                          >
                            {result.siteURL}
                          </a>
                        ) : (
                          <span className="text-sm text-green-600 font-medium">Existing deployment found</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center">
                    {isDeploying ? (
                      <div className="w-full text-bolt-elements-textSecondary flex items-center justify-center py-4 bg-bolt-elements-background-depth-1/50 rounded-xl border border-bolt-elements-borderColor/30">
                        <div className="w-6 h-6 border-2 border-bolt-elements-borderColor/30 border-t-blue-500 rounded-full animate-spin mr-3" />
                        <span className="text-lg font-medium">
                          {hasExistingSite ? 'Redeploying' : 'Deploying'} your app...
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={handleDeploy}
                        disabled={isDeploying}
                        className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-lg font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 hover:border-white/30 group"
                      >
                        <div className="i-ph:rocket-launch text-xl transition-transform duration-200 group-hover:scale-110"></div>
                        <span className="transition-transform duration-200 group-hover:scale-105">
                          {hasExistingSite ? 'Redeploy' : 'Deploy Now'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Advanced Settings Section */}
                <div className="mb-8">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    disabled={isDeploying}
                    className={`w-full flex items-center justify-between p-4 bg-bolt-elements-background-depth-2/50 border border-bolt-elements-borderColor/50 hover:bg-bolt-elements-background-depth-3/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md group ${
                      showAdvanced ? 'rounded-t-xl border-b-0' : 'rounded-xl'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="i-ph:gear text-lg text-bolt-elements-textSecondary transition-transform duration-200 group-hover:scale-110" />
                      <div className="text-left">
                        <span className="text-bolt-elements-textPrimary font-semibold">Advanced Settings</span>
                        <div className="text-xs text-bolt-elements-textSecondary">
                          Custom Netlify & Supabase credentials
                        </div>
                      </div>
                    </div>
                    <div
                      className={`text-bolt-elements-textSecondary transition-all duration-200 ${showAdvanced ? 'rotate-180' : ''} group-hover:scale-110`}
                    >
                      <div className="i-ph:caret-down text-bolt-elements-textPrimary text-lg" />
                    </div>
                  </button>

                  {showAdvanced && (
                    <div className="bg-bolt-elements-background-depth-2/50 border border-bolt-elements-borderColor/50 border-t-0 rounded-b-xl shadow-lg">
                      <div className="p-6 space-y-6">
                        <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                          <div className="flex items-start gap-3">
                            <div className="i-ph:info text-lg text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <h3 className="text-sm font-semibold text-blue-700 mb-2">Before you begin:</h3>
                              <p className="text-xs text-blue-600 mb-3 leading-relaxed">
                                You'll need accounts with {databaseFound ? 'both Netlify and Supabase' : 'Netlify'} to
                                deploy with custom settings.
                              </p>
                              <div className="flex flex-col items-center gap-2">
                                <a
                                  href="https://app.netlify.com/signup"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-700 transition-colors font-medium flex items-center gap-1 hover:gap-2"
                                >
                                  <div className="i-ph:arrow-square-out" />
                                  Sign up for Netlify
                                </a>
                                {databaseFound && (
                                  <a
                                    href="https://supabase.com/dashboard/sign-up"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-700 transition-colors font-medium flex items-center gap-1 hover:gap-2"
                                  >
                                    <div className="i-ph:arrow-square-out" />
                                    Sign up for Supabase
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Netlify Fields */}
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-bolt-elements-textPrimary">
                              Netlify Auth Token
                            </label>
                            <p className="text-xs text-bolt-elements-textSecondary leading-relaxed mb-2 whitespace-pre-wrap">
                              Your personal access token from{' '}
                              <a
                                href="https://app.netlify.com/user/applications#personal-access-tokens"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-600 underline"
                              >
                                Netlify user settings
                              </a>
                              . Used to authorize deployments.
                            </p>
                            <input
                              name="netlifyAuthToken"
                              className="w-full p-3 border rounded-xl bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor/50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 shadow-sm focus:shadow-md"
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

                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-bolt-elements-textPrimary">
                              Netlify Team Slug (new site)
                            </label>
                            <p className="text-xs text-bolt-elements-textSecondary leading-relaxed mb-2 whitespace-pre-wrap">
                              Your Netlify team slug can be found in the "Team settings" section
                            </p>
                            <input
                              name="netlifyAccountSlug"
                              className="w-full p-3 border rounded-xl bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor/50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 shadow-sm focus:shadow-md"
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

                          <div className="md:col-span-2 space-y-2">
                            <label className="block text-sm font-semibold text-bolt-elements-textPrimary">
                              Netlify Site Name (new site)
                            </label>
                            <p className="text-xs text-bolt-elements-textSecondary leading-relaxed mb-2 whitespace-pre-wrap">
                              The desired name for your new Netlify site. Will be part of your site's URL.
                            </p>
                            <input
                              name="netlifySiteName"
                              className="w-full p-3 border rounded-xl bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor/50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 shadow-sm focus:shadow-md"
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
                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-bolt-elements-textPrimary">
                                  Supabase Database URL
                                </label>
                                <p className="text-xs text-bolt-elements-textSecondary leading-relaxed mb-2 whitespace-pre-wrap">
                                  The URL of your Supabase project, used to connect to your database.
                                </p>
                                <input
                                  name="supabaseDatabaseURL"
                                  className="w-full p-3 border rounded-xl bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor/50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 shadow-sm focus:shadow-md"
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

                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-bolt-elements-textPrimary">
                                  Supabase Anonymous Key
                                </label>
                                <p className="text-xs text-bolt-elements-textSecondary leading-relaxed mb-2 whitespace-pre-wrap">
                                  Public API key for client-side database access with restricted permissions.
                                </p>
                                <input
                                  name="supabaseAnonKey"
                                  className="w-full p-3 border rounded-xl bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor/50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 shadow-sm focus:shadow-md"
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

                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-bolt-elements-textPrimary">
                                  Supabase Service Role Key
                                </label>
                                <p className="text-xs text-bolt-elements-textSecondary leading-relaxed mb-2 whitespace-pre-wrap">
                                  Admin API key for server-side operations with full database access.
                                </p>
                                <input
                                  name="supabaseServiceRoleKey"
                                  className="w-full p-3 border rounded-xl bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor/50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 shadow-sm focus:shadow-md"
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

                              <div className="space-y-2">
                                <label className="block text-sm font-semibold text-bolt-elements-textPrimary">
                                  Supabase Postgres URL
                                </label>
                                <p className="text-xs text-bolt-elements-textSecondary leading-relaxed mb-2 whitespace-pre-wrap">
                                  Direct connection URL to your Postgres database for advanced operations.
                                </p>
                                <input
                                  name="supabasePostgresURL"
                                  className="w-full p-3 border rounded-xl bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor/50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 shadow-sm focus:shadow-md"
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
                            <div className="w-full text-bolt-elements-textSecondary flex items-center justify-center py-4 bg-bolt-elements-background-depth-1/50 rounded-xl border border-bolt-elements-borderColor/30">
                              <div className="w-6 h-6 border-2 border-bolt-elements-borderColor/30 border-t-blue-500 rounded-full animate-spin mr-3" />
                              <span className="text-lg font-medium">Deploying with custom settings...</span>
                            </div>
                          ) : (
                            <button
                              onClick={handleDeploy}
                              disabled={isDeploying}
                              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-lg font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 hover:border-white/30 group"
                            >
                              <div className="i-ph:rocket-launch text-xl transition-transform duration-200 group-hover:scale-110" />
                              <span className="transition-transform duration-200 group-hover:scale-105">
                                Deploy with Custom Settings
                              </span>
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
                    className="px-6 py-3 bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary border border-bolt-elements-borderColor rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md hover:scale-105 group"
                  >
                    <span className="transition-transform duration-200 group-hover:scale-105">Cancel</span>
                  </button>
                </div>

                {error && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 text-red-700 rounded-xl shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="i-ph:warning-circle text-lg text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">Deployment Error</p>
                        <p className="text-sm leading-relaxed">{error}</p>
                      </div>
                    </div>
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
