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
      const { keys } = await callNutAPI('get-app-secret-keys', { appId });
      const record: Record<string, string> = {};
      for (const key of keys) {
        record[key] = '***';
      }
      setSecretValues(record);
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
        className="p-3 border border-bolt-elements-borderColor rounded-lg bg-bolt-elements-background-depth-1"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-bolt-elements-textPrimary">{secret.name}</span>
          <span
            className={classNames(
              'px-2 py-1 text-xs font-medium rounded',
              isBuiltin
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-yellow-100 text-yellow-800 border border-yellow-200',
            )}
          >
            {isBuiltin ? 'Built-in' : 'Required'}
          </span>
        </div>

        {secret.description && <p className="text-sm text-bolt-elements-textSecondary mb-3">{secret.description}</p>}

        {!isBuiltin && (
          <div className="space-y-3">
            <div>
              <label
                htmlFor={`secret-${secret.name}`}
                className="block text-xs font-medium text-bolt-elements-textSecondary mb-1"
              >
                Secret Value
              </label>
              <input
                id={`secret-${secret.name}`}
                type="password"
                value={currentValue}
                onChange={(e) => handleSecretValueChange(secret.name, e.target.value)}
                placeholder="Enter secret value..."
                className="w-full px-3 py-2 text-sm border border-bolt-elements-borderColor rounded-md bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary placeholder-bolt-elements-textSecondary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleSaveSecret(secret.name)}
                disabled={isSaving || !currentValue.trim()}
                className={classNames(
                  'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  isSaving || !currentValue.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                )}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {!currentValue && (
          <div
            className={classNames(
              'text-xs p-2 rounded mt-3',
              isBuiltin
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200',
            )}
          >
            {isBuiltin ? (
              <span>✅ This secret will use a builtin value</span>
            ) : (
              <span>⚠️ This secret must be added before using the app</span>
            )}
          </div>
        )}
      </div>
    );
  };

  const secrets = appSummary?.features?.flatMap((f) => f.secrets ?? []) ?? [];

  return (
    <div>
      <div className="space-y-4 mb-2">
        <div className="text-lg font-semibold text-bolt-elements-textPrimary">Secrets</div>
        <div className="space-y-3">{secrets.map(renderSecret)}</div>
      </div>
    </div>
  );
};

export default Secrets;
