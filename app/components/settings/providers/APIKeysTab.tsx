import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import { anthropicNumFreeUsesCookieName, anthropicApiKeyCookieName, maxFreeUses } from '~/utils/freeUses';
import { saveNutLoginKey, saveUsername, getNutLoginKey, getUsername } from '~/lib/replay/Problems';
import { debounce } from '~/utils/debounce';

export default function ConnectionsTab() {
  const [apiKey, setApiKey] = useState(Cookies.get(anthropicApiKeyCookieName) || '');
  const [username, setUsername] = useState(getUsername() || '');
  const [loginKey, setLoginKey] = useState(getNutLoginKey() || '');
  const numFreeUses = +(Cookies.get(anthropicNumFreeUsesCookieName) || 0);

  const handleSaveAPIKey = async (key: string) => {
    if (key && !key.startsWith('sk-ant-')) {
      toast.error('Please provide a valid Anthropic API key');
      return;
    }

    Cookies.set('anthropicApiKey', key);
    setApiKey(key);
  };

  const saveUsernameWithToast = (username: string) => {
    saveUsername(username);
    toast.success('Username saved!');
  };

  const debouncedSaveUsername = useCallback(debounce(saveUsernameWithToast, 1000), []);

  const handleSaveUsername = async (username: string) => {
    setUsername(username);
    debouncedSaveUsername(username);
  };

  const handleSaveLoginKey = async (key: string) => {
    setLoginKey(key);

    try {
      await saveNutLoginKey(key);
      toast.success('Login key saved');
    } catch {
      toast.error('Failed to save login key');
    }
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
      {numFreeUses < maxFreeUses && (
        <div className="flex mb-4">
          <div className="flex-1 mr-2">
            {maxFreeUses - numFreeUses} / {maxFreeUses} free uses remaining
          </div>
        </div>
      )}
      <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-4">Problems User Name</h3>
      <div className="flex mb-4">
        <div className="flex-1 mr-2">
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => handleSaveUsername(e.target.value)}
            className="w-full bg-white dark:bg-bolt-elements-background-depth-4 relative px-2 py-1.5 rounded-md focus:outline-none placeholder-bolt-elements-textTertiary text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary border border-bolt-elements-borderColor disabled:opacity-50"
          />
        </div>
      </div>
      <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-4">Nut Login Key</h3>
      <div className="flex mb-4">
        <div className="flex-1 mr-2">
          <input
            type="text"
            placeholder="Enter your login key"
            value={loginKey}
            onChange={(e) => handleSaveLoginKey(e.target.value)}
            className="w-full bg-white dark:bg-bolt-elements-background-depth-4 relative px-2 py-1.5 rounded-md focus:outline-none placeholder-bolt-elements-textTertiary text-bolt-elements-textPrimary dark:text-bolt-elements-textPrimary border border-bolt-elements-borderColor disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
}
