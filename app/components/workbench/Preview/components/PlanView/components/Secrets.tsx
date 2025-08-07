import { type AppSummary, type AppDetail } from '~/lib/persistence/messageAppSummary';
import { classNames } from '~/utils/classNames';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { chatStore } from '~/lib/stores/chat';
import { assert } from '~/utils/nut';
import { callNutAPI } from '~/lib/replay/NutAPI';

interface SecretsProps {
  appSummary: AppSummary;
}

// Secrets which values do not need to be provided for.
const BUILTIN_SECRET_NAMES = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];

const Secrets = ({ appSummary }: SecretsProps) => {
  const [secretValues, setSecretValues] = useState<Record<string, string>>({});
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

  const appId = chatStore.currentAppId.get();
  assert(appId, 'App ID is required');

  useEffect(() => {
    (async () => {
      try {
        const response = await callNutAPI('get-app-secret-keys', { appId });
        const keys = response?.keys || [];
        const record: Record<string, string> = {};

        if (Array.isArray(keys)) {
          for (const key of keys) {
            record[key] = '***';
          }
        }

        setSecretValues(record);
      } catch (error) {
        console.error('Failed to fetch secret keys:', error);
        setSecretValues({});
      }
    })();
  }, []);

  const handleSecretValueChange = (secretName: string, value: string) => {
    setSecretValues((prev) => ({
      ...prev,
      [secretName]: value,
    }));
  };

  const handleSaveSecret = async (secretName: string) => {
    setSavingStates((prev) => ({ ...prev, [secretName]: true }));

    try {
      await callNutAPI('set-app-secrets', {
        appId,
        secrets: [
          {
            key: secretName,
            value: secretValues[secretName],
          },
        ],
      });

      toast.success('Secret saved successfully');
    } catch (error) {
      toast.error('Failed to save secret');
      console.error('Failed to save secret:', error);
    } finally {
      setSavingStates((prev) => ({ ...prev, [secretName]: false }));
    }
  };

  const renderSecret = (secret: AppDetail, index: number) => {
    const isBuiltin = BUILTIN_SECRET_NAMES.includes(secret.name);
    const currentValue = secretValues[secret.name] || '';
    const isSaving = savingStates[secret.name] || false;

    return (
      <div
        key={index}
        className="p-4 border border-bolt-elements-borderColor/30 rounded-xl bg-bolt-elements-background-depth-2 shadow-sm hover:shadow-md transition-all duration-200 hover:border-bolt-elements-borderColor/50"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-bolt-elements-textHeading">{secret.name}</span>
          <span
            className={classNames(
              'px-3 py-1.5 text-xs font-medium rounded-full shadow-sm border transition-all duration-200',
              isBuiltin
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 hover:shadow-md'
                : 'bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border-yellow-200 hover:shadow-md',
            )}
          >
            {isBuiltin ? 'Built-in' : 'Required'}
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
                placeholder="Enter secret value..."
                className="w-full px-4 py-3 text-sm border border-bolt-elements-borderColor/60 rounded-xl bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary placeholder-bolt-elements-textSecondary focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleSaveSecret(secret.name)}
                disabled={isSaving || !currentValue.trim()}
                className={classNames(
                  'px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 shadow-sm',
                  isSaving || !currentValue.trim()
                    ? 'bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary cursor-not-allowed border border-bolt-elements-borderColor/30'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:shadow-md hover:scale-105 active:scale-95',
                )}
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-bolt-elements-textSecondary border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        )}

        {!currentValue && (
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
      </div>
    );
  };

  const secrets = appSummary?.features?.flatMap((f) => f.secrets ?? []) ?? [];

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
