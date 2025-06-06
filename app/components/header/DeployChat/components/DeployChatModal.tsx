import { DeployStatus } from '~/components/header/DeployChat/DeployChat';

interface DeployChatModalProps {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  status: DeployStatus;
  deploySettings: any;
  setDeploySettings: (settings: any) => void;
  error: string | null;
  handleDeploy: () => void;
}

const DeployChatModal = ({
  isModalOpen,
  setIsModalOpen,
  status,
  deploySettings,
  setDeploySettings,
  error,
  handleDeploy,
}: DeployChatModalProps) => {
  return (
    <>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full z-50">
            {status === DeployStatus.Succeeded ? (
              <>
                <div className="text-center mb-2">Deployment Succeeded</div>
                <div className="text-center">
                  <div className="flex justify-center gap-2 mt-4">
                    <a href={deploySettings?.siteURL} target="_blank" rel="noopener noreferrer">
                      <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                        {deploySettings?.siteURL}
                      </button>
                    </a>
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
                <div className="text-center mb-4">Deploy this chat's app to production.</div>

                {deploySettings?.siteURL && (
                  <div className="text-center mb-4">
                    <span className="text-lg text-gray-700 pr-2">Existing site:</span>
                    <a href={deploySettings?.siteURL} target="_blank" rel="noopener noreferrer">
                      <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                        {deploySettings?.siteURL}
                      </button>
                    </a>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-4 items-center">
                  <label className="text-sm font-lg text-gray-700 text-right">Netlify Auth Token:</label>
                  <input
                    name="netlifyAuthToken"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
                    value={deploySettings?.netlify?.authToken}
                    placeholder="nfp_..."
                    onChange={(e) => {
                      const netlify = {
                        authToken: e.target.value,
                        siteId: deploySettings?.netlify?.siteId || '',
                        createInfo: deploySettings?.netlify?.createInfo || undefined,
                      };
                      setDeploySettings({
                        ...deploySettings,
                        netlify,
                      });
                    }}
                  />
                  <label className="text-sm font-lg text-gray-700 text-right">Netlify Site ID (existing site):</label>
                  <input
                    name="netlifySiteId"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
                    value={deploySettings?.netlify?.siteId}
                    placeholder="123e4567-..."
                    onChange={(e) => {
                      const netlify = {
                        authToken: deploySettings?.netlify?.authToken || '',
                        siteId: e.target.value,
                        createInfo: deploySettings?.netlify?.createInfo || undefined,
                      };
                      setDeploySettings({
                        ...deploySettings,
                        netlify,
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
                      const netlify = {
                        authToken: deploySettings?.netlify?.authToken || '',
                        siteId: deploySettings?.netlify?.siteId || '',
                        createInfo,
                      };
                      setDeploySettings({
                        ...deploySettings,
                        netlify,
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
                      const netlify = {
                        authToken: deploySettings?.netlify?.authToken || '',
                        siteId: deploySettings?.netlify?.siteId || '',
                        createInfo,
                      };
                      setDeploySettings({
                        ...deploySettings,
                        netlify,
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
                        serviceRoleKey: deploySettings?.supabase?.serviceRoleKey || '',
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
                        serviceRoleKey: deploySettings?.supabase?.serviceRoleKey || '',
                        postgresURL: deploySettings?.supabase?.postgresURL || '',
                      };
                      setDeploySettings({
                        ...deploySettings,
                        supabase,
                      });
                    }}
                  />
                  <label className="text-sm font-lg text-gray-700 text-right">Supabase Service Role Key:</label>
                  <input
                    name="supabaseServiceRoleKey"
                    className="bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary rounded px-2 py-2 border border-gray-300"
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

                <div className="flex justify-center gap-2 mt-4">
                  {status === DeployStatus.Started && (
                    <div className="w-full text-bolt-elements-textSecondary flex items-center">
                      <span className="i-svg-spinners:3-dots-fade inline-block w-[1em] h-[1em] mr-2 text-4xl"></span>
                    </div>
                  )}

                  {status === DeployStatus.NotStarted && (
                    <button
                      onClick={handleDeploy}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                      Deploy
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                    }}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DeployChatModal;
