import { useState } from 'react';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import { anthropicNumFreeUsesCookieName, anthropicApiKeyCookieName, MaxFreeUses } from '~/utils/freeUses';

export default function ConnectionsTab() {
  const [apiKey, setApiKey] = useState(Cookies.get(anthropicApiKeyCookieName) || '');
  const [adminKey, setAdminKey] = useState(Cookies.get('nutAdminKey') || '');
  const numFreeUses = +(Cookies.get(anthropicNumFreeUsesCookieName) || 0);

  const handleSaveAPIKey = async (key: string) => {
    if (!key || !key.startsWith('sk-ant-')) {
      toast.error('Please provide a valid Anthropic API key');
      return;
    }

    Cookies.set('anthropicApiKey', key);
    setApiKey(key);
  };

  const handleSaveAdminKey = async (key: string) => {
    if (!key) {
      toast.error('Admin key not specified')
      return;
    }

    Cookies.set('nutAdminKey', key);
    setAdminKey(key);
  };

  return (
    <div className="p-4 mb-4 border border-bolt-elements-borderColor rounded-lg bg-bolt-elements-background-depth-3">
      <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-4">Anthropic API Key</h3>
      <div className="flex mb-4">
        <div className="flex-1 mr-2">
          <input
            type="text"
            value={apiKey}
            onChange={(e) => handleSaveAPIKey(e.target.value)}
            className="w-full bg-white dark:bg-bolt-elements-background-depth-4 relative px-2 py-1.5 rounded-md focus:outline-none placeholder-bolt-elements-textTertiary text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary border border-bolt-elements-borderColor disabled:opacity-50"
          />
        </div>
      </div>
      {numFreeUses < MaxFreeUses && (
        <div className="flex mb-4">
          <div className="flex-1 mr-2">
            {MaxFreeUses - numFreeUses} / {MaxFreeUses} free uses remaining
          </div>
        </div>
      )}
      <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-4">Problems Username</h3>
      <div className="flex mb-4">
        <div className="flex-1 mr-2">
          <input
            type="text"
            value={adminKey}
            onChange={(e) => handleSaveAdminKey(e.target.value)}
            className="w-full bg-white dark:bg-bolt-elements-background-depth-4 relative px-2 py-1.5 rounded-md focus:outline-none placeholder-bolt-elements-textTertiary text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary border border-bolt-elements-borderColor disabled:opacity-50"
          />
        </div>
      </div>
      <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-4">Nut Admin Key</h3>
      <div className="flex mb-4">
        <div className="flex-1 mr-2">
          <input
            type="text"
            value={adminKey}
            onChange={(e) => handleSaveAdminKey(e.target.value)}
            className="w-full bg-white dark:bg-bolt-elements-background-depth-4 relative px-2 py-1.5 rounded-md focus:outline-none placeholder-bolt-elements-textTertiary text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary border border-bolt-elements-borderColor disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
}
