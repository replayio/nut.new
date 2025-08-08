import { type AppSummary } from '~/lib/persistence/messageAppSummary';
import { classNames } from '~/utils/classNames';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { chatStore, onChatResponse } from '~/lib/stores/chat';
import { assert } from '~/utils/nut';
import { callNutAPI } from '~/lib/replay/NutAPI';
import { useStore } from '@nanostores/react';

// Secrets which values do not need to be provided for.
const BUILTIN_SECRET_NAMES = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];

interface SecretInfo {
  name: string;
  description: string;
  value?: string; // Any value set by the client.
  set: boolean;
  saving: boolean;
}

function buildSecretInfo(appSummary: AppSummary): SecretInfo[] {
  const secrets = appSummary?.features?.flatMap((f) => f.secrets ?? []) ?? [];

  return secrets.map((s) => ({
    name: s.name,
    description: s.description,
    value: undefined,
    set: appSummary.setSecrets?.includes(s.name) ?? false,
    saving: false,
  }));
}

const Secrets = () => {
  const appSummary = useStore(chatStore.appSummary);
  assert(appSummary, 'App summary is required');

  const [secrets, setSecrets] = useState<SecretInfo[]>([]);

  useEffect(() => {
    setSecrets(buildSecretInfo(appSummary));
  }, [appSummary]);

  const appId = chatStore.currentAppId.get();
  assert(appId, 'App ID is required');

  const handleSecretValueChange = (secretName: string, value: string) => {
    setSecrets((prev) => {
      const secret = prev.find((s) => s.name == secretName);
      if (secret) {
        secret.value = value;
      }
      return [...prev];
    });
  };

  const handleSaveSecret = async (secretName: string) => {
    setSecrets((prev) => {
      const secret = prev.find((s) => s.name == secretName);
      if (secret) {
        secret.saving = true;
      }
      return [...prev];
    });

    try {
      const value = secrets.find((s) => s.name == secretName)?.value;

      const { response } = await callNutAPI('set-app-secrets', {
        appId,
        secrets: [
          {
            key: secretName,
            value,
          },
        ],
      });

      if (response) {
        onChatResponse(response, 'SetAppSecrets');
      }

      toast.success('Secret saved successfully');
    } catch (error) {
      toast.error('Failed to save secret');
      console.error('Failed to save secret:', error);
    } finally {
      setSecrets((prev) => {
        const secret = prev.find((s) => s.name == secretName);
        if (secret) {
          secret.saving = false;
        }
        return [...prev];
      });
    }
  };

  const renderSecret = (secret: SecretInfo, index: number) => {
    const isBuiltin = BUILTIN_SECRET_NAMES.includes(secret.name);
    const currentValue = secret.value || '';
    const isSaving = secret.saving;
    const isSet = secret.set;

    return (
      <div
        key={index}
        className={classNames(
          'p-4 border rounded-xl shadow-sm hover:shadow-md transition-all duration-200',
          isSet && !currentValue.length
            ? 'border-gray-300 bg-gray-50 hover:border-gray-400'
            : 'border-bolt-elements-borderColor/30 bg-bolt-elements-background-depth-2 hover:border-bolt-elements-borderColor/50',
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-bolt-elements-textHeading">{secret.name}</span>
          <span
            className={classNames(
              'px-3 py-1.5 text-xs font-medium rounded-full shadow-sm border transition-all duration-200',
              isSet
                ? 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-gray-200 hover:shadow-md'
                : isBuiltin
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 hover:shadow-md'
                  : 'bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border-yellow-200 hover:shadow-md',
            )}
          >
            {isSet ? 'Set' : isBuiltin ? 'Built-in' : 'Required'}
          </span>
        </div>

        {secret.description && (
          <p className="text-sm text-bolt-elements-textSecondary mb-4 leading-relaxed">{secret.description}</p>
        )}

        {!isBuiltin && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor={`secret-${secret.name}`}
                className="block text-xs font-medium text-bolt-elements-textSecondary mb-2"
              >
                Secret Value
              </label>
              <input
                id={`secret-${secret.name}`}
                type="password"
                value={currentValue}
                onChange={(e) => handleSecretValueChange(secret.name, e.target.value)}
                placeholder={isSet ? 'Click to change secret value...' : 'Enter secret value...'}
                className={classNames(
                  'w-full px-4 py-3 text-sm border rounded-xl transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400',
                  isSet && !currentValue.length
                    ? 'border-gray-300 bg-gray-100 text-gray-700 placeholder-gray-500 hover:bg-gray-200'
                    : 'border-bolt-elements-borderColor/60 bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary placeholder-bolt-elements-textSecondary',
                )}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleSaveSecret(secret.name)}
                disabled={isSaving || (!isSet && !currentValue.trim())}
                className={classNames(
                  'px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 shadow-sm',
                  isSaving || (!isSet && !currentValue.trim())
                    ? 'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary cursor-not-allowed border border-bolt-elements-borderColor/30'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:shadow-md hover:scale-105 active:scale-95',
                )}
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-bolt-elements-textSecondary border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : isSet ? (
                  currentValue.length ? (
                    'Update Secret'
                  ) : (
                    'Clear Secret'
                  )
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        )}

        {!currentValue && !isSet && (
          <div
            className={classNames(
              'text-xs p-3 rounded-xl mt-4 border shadow-sm',
              isBuiltin
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200/50'
                : 'bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border-yellow-200/50',
            )}
          >
            {isBuiltin ? (
              <span className="flex items-center gap-2">
                <div className="i-ph:check-circle-duotone text-green-600 text-sm"></div>
                This secret will use a builtin value
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <div className="i-ph:warning-circle-duotone text-yellow-600 text-sm"></div>
                This secret must be added before using the app
              </span>
            )}
          </div>
        )}

        {isSet && (
          <div className="text-xs p-3 rounded-xl mt-4 border shadow-sm bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-gray-200/50">
            <span className="flex items-center gap-2">
              <div className="i-ph:check-circle-duotone text-gray-600 text-sm"></div>
              This secret is configured and ready to use
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="space-y-6 mb-4">
        <div className="flex items-center gap-3 p-4 bg-bolt-elements-background-depth-1 rounded-xl border border-bolt-elements-borderColor/30 shadow-sm">
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
            <div className="i-ph:key-duotone text-white text-lg"></div>
          </div>
          <div className="text-lg font-semibold text-bolt-elements-textHeading">Secrets</div>
        </div>
        <div className="space-y-4">{secrets.map(renderSecret)}</div>
      </div>
    </div>
  );
};

export default Secrets;
