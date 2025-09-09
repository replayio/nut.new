import { DeployStatus } from '~/components/header/DeployChat/DeployChatButton';
import DeploymentSuccessful from './DeploymentSuccessful';
import { lastDeployResult, type DeploySettings } from '~/lib/replay/Deploy';
import { Dialog, DialogRoot } from '~/components/ui/Dialog';

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
  const isDeploying = status === DeployStatus.Started;
  const result = lastDeployResult(deploySettings);
  const hasExistingSite = Boolean(result?.siteURL);

  if (loadingData) {
    return (
      <DialogRoot open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <Dialog onClose={() => setIsModalOpen(false)} className="max-w-md">
          <div className="p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-lg">
                <div className="w-8 h-8 border-2 border-bolt-elements-borderColor/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
              <h3 className="text-2xl font-bold text-bolt-elements-textHeading mb-3">Loading data...</h3>
              <p className="text-bolt-elements-textSecondary">Please wait while we prepare your deployment settings</p>
            </div>
          </div>
        </Dialog>
      </DialogRoot>
    );
  }

  return (
    <DialogRoot open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
      <Dialog onClose={() => setIsModalOpen(false)} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {status === DeployStatus.Succeeded ? (
            <DeploymentSuccessful result={result} setIsModalOpen={setIsModalOpen} />
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20 shadow-lg">
                  <div className="i-ph:rocket-launch text-2xl text-blue-500" />
                </div>
                <h2 className="text-3xl font-bold text-bolt-elements-textHeading">Deploy Your Application</h2>
                <p className="text-bolt-elements-textSecondary mt-2">
                  Get your app live on the web in just a few clicks
                </p>
              </div>

              {/* Easy Deploy Section */}
              <div className="mb-8 p-6 bg-bolt-elements-background-depth-2/30 rounded-2xl border border-bolt-elements-borderColor/30 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2 mb-4">
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
                      className="flex items-center gap-3 px-8 py-4 !bg-gradient-to-r !from-blue-500 !to-indigo-500 hover:!from-blue-600 hover:!to-indigo-600 text-white text-lg font-semibold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/20 hover:border-white/30 group"
                    >
                      <div className="i-ph:rocket-launch text-xl transition-transform duration-200 group-hover:scale-110"></div>
                      <span className="transition-transform duration-200 group-hover:scale-105">
                        {hasExistingSite ? 'Redeploy' : 'Deploy Now'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 bg-bolt-elements-background-depth-2/30 rounded-xl border border-bolt-elements-borderColor/30 space-y-4">
                <div>
                  <label htmlFor="siteName" className="block mb-2 text-sm font-semibold text-bolt-elements-textPrimary">
                    Site Name (optional)
                  </label>
                  <p className="text-sm text-bolt-elements-textSecondary leading-relaxed mb-3">
                    Choose a custom prefix for your site's URL.
                  </p>
                  <div className="relative">
                    <input
                      id="siteName"
                      name="siteName"
                      type="text"
                      className="w-full p-4 pr-32 border rounded-xl bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary border-bolt-elements-borderColor/50 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 shadow-sm focus:shadow-md"
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
                  {deploySettings.siteName && (
                    <div className="mt-2 p-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-lg border border-blue-500/20">
                      <p className="text-sm text-bolt-elements-textSecondary">
                        <span className="font-medium text-bolt-elements-textPrimary">
                          Your site will be available at:
                        </span>
                        <br />
                        <span className="font-mono text-blue-600 text-sm">
                          https://{deploySettings.siteName}.netlify.app
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={isDeploying}
                  className="px-6 py-3 bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary border border-bolt-elements-borderColor rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md hover:scale-[1.02] group"
                >
                  <span className="transition-transform duration-200 group-hover:scale-105">Cancel</span>
                </button>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl shadow-sm">
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
      </Dialog>
    </DialogRoot>
  );
};

export default DeployChatModal;
