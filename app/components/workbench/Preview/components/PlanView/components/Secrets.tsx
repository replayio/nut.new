import { type AppSummary } from '~/lib/persistence/messageAppSummary';
import { classNames } from '~/utils/classNames';
import { CheckCircle, AlertTriangle } from '~/components/ui/Icon';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { chatStore } from '~/lib/stores/chat';
import { assert } from '~/utils/nut';
import { useStore } from '@nanostores/react';
import { getAppSetSecrets, setAppSecrets } from '~/lib/replay/Secrets';

// Secrets which values do not need to be provided for.
const BUILTIN_SECRET_NAMES = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'];

interface SecretInfo {
  name: string;
  description: string;
  value?: string; // Any value set by the client.
  set: boolean;
  saving: boolean;
}

function buildSecretInfo(appSummary: AppSummary, setSecrets: string[]): SecretInfo[] {
  const secrets = appSummary?.secrets ?? [];

  return secrets.map((s) => ({
    name: s.name,
    description: s.description,
    value: undefined,
    set: setSecrets.includes(s.name) ?? false,
    saving: false,
  }));
}

const Secrets = () => {
  const appSummary = useStore(chatStore.appSummary);
  assert(appSummary, 'App summary is required');

  const [secrets, setSecrets] = useState<SecretInfo[]>([]);

  const appId = chatStore.currentAppId.get();
  assert(appId, 'App ID is required');

  useEffect(() => {
    async function updateSecrets() {
      const appSetSecrets = await getAppSetSecrets(appId!);
      setSecrets(buildSecretInfo(appSummary!, appSetSecrets));
    }
    updateSecrets();
  }, [appSummary]);

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

      await setAppSecrets(appId, [
        {
          key: secretName,
          value,
        },
      ]);

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
          'p-4 border rounded-md transition-colors',
          isSet && !currentValue.length ? 'border-border bg-muted' : 'border-border bg-card hover:bg-accent/50',
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground">{secret.name}</span>
          <span
            className={classNames(
              'px-3 py-1.5 text-xs font-medium rounded-full border',
              isSet
                ? 'bg-muted text-muted-foreground border-border'
                : isBuiltin
                  ? 'bg-accent text-foreground border-border'
                  : 'bg-accent text-foreground border-border',
            )}
          >
            {isSet ? 'Set' : isBuiltin ? 'Built-in' : 'Required'}
          </span>
        </div>

        {secret.description && (
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{secret.description}</p>
        )}

        {!isBuiltin && (
          <div className="space-y-4">
            <div>
              <label htmlFor={`secret-${secret.name}`} className="block text-xs font-medium text-muted-foreground mb-2">
                Secret Value
              </label>
              <input
                id={`secret-${secret.name}`}
                type="password"
                value={currentValue}
                onChange={(e) => handleSecretValueChange(secret.name, e.target.value)}
                placeholder={isSet ? 'Click to change secret value...' : 'Enter secret value...'}
                className={classNames(
                  'w-full px-4 py-3 text-sm border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  isSet && !currentValue.length
                    ? 'border-border bg-muted text-muted-foreground placeholder-muted-foreground'
                    : 'border-border bg-background text-foreground placeholder-muted-foreground',
                )}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleSaveSecret(secret.name)}
                disabled={isSaving || (!isSet && !currentValue.trim())}
                className="px-5 py-2.5 text-sm font-medium rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
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
              'text-xs p-3 rounded-md mt-4 border',
              isBuiltin ? 'bg-muted text-muted-foreground border-border' : 'bg-accent text-foreground border-border',
            )}
          >
            {isBuiltin ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="text-muted-foreground" size={14} />
                This secret will use a builtin value
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <AlertTriangle className="text-muted-foreground" size={14} />
                This secret must be added before using the app
              </span>
            )}
          </div>
        )}

        {isSet && (
          <div className="text-xs p-3 rounded-md mt-4 border bg-muted text-muted-foreground border-border">
            <span className="flex items-center gap-2">
              <CheckCircle className="text-muted-foreground" size={14} />
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
        <div className="space-y-4">{secrets.map(renderSecret)}</div>
      </div>
    </div>
  );
};

export default Secrets;
