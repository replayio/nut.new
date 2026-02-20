import { useEffect, useState, useCallback, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { callNutAPI } from '~/lib/replay/NutAPI';
import { chatStore, onChatResponse } from '~/lib/stores/chat';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/ui/accordion';
import { Markdown } from '~/components/chat/Markdown';
import { Copy, Key, RefreshCw, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { Skeleton } from '~/components/ui/Skeleton';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import WithTooltip from '~/components/ui/Tooltip';
import { classNames } from '~/utils/classNames';
import { Button } from '~/components/ui/button';

interface WebhookConfig {
  // Functions that can be called without any access keys.
  publicFunctions?: string[];

  // Functions that can be called with an access key set.
  accessKeyFunctions?: string[];

  // The key to use for the access key functions.
  accessKey?: string;
}

interface WebhookDocumentation {
  // Map function name to markdown string description.
  functions?: Record<string, string>;
}

async function getWebhookConfig(
  appId: string,
): Promise<{ config: WebhookConfig; documentation: WebhookDocumentation }> {
  if (!appId) {
    return { config: {}, documentation: {} };
  }
  const { config, documentation } = await callNutAPI('get-webhook-config', { appId });
  return { config, documentation };
}

async function setWebhookConfig(appId: string, config: WebhookConfig): Promise<void> {
  if (!appId) {
    return;
  }
  const { response } = await callNutAPI('set-webhook-config', { appId, config });
  if (response) {
    onChatResponse(response, 'SetWebhookConfig');
  }
}

function generateRandomAccessKey(): string {
  // Generate a secure random key (32 characters, base64-like)
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

type WebhookSetting = 'disabled' | 'public' | 'accessKey';

function getWebhookSetting(functionName: string, config: WebhookConfig): WebhookSetting {
  if (config.publicFunctions?.includes(functionName)) {
    return 'public';
  }
  if (config.accessKeyFunctions?.includes(functionName)) {
    return 'accessKey';
  }
  return 'disabled';
}

export const WebhooksPanel = () => {
  const appId = useStore(chatStore.currentAppId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<WebhookConfig>({});
  const [savedConfig, setSavedConfig] = useState<WebhookConfig>({});
  const [documentation, setDocumentation] = useState<WebhookDocumentation>({});

  const accessKey = useMemo(() => {
    return config.accessKey || generateRandomAccessKey();
  }, [config.accessKey]);

  // Ensure access key is set in config if not present
  useEffect(() => {
    if (!config.accessKey && appId) {
      setConfig((prev) => ({ ...prev, accessKey: generateRandomAccessKey() }));
    }
  }, [config.accessKey, appId]);

  useEffect(() => {
    if (!appId) {
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        setLoading(true);
        const result = await getWebhookConfig(appId);
        const initialConfig = result.config || {};
        setConfig(initialConfig);
        setSavedConfig(initialConfig);
        setDocumentation(result.documentation || {});
      } catch (error) {
        console.error('Failed to fetch webhook config:', error);
        toast.error('Failed to load webhook configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [appId]);

  const handleCopyAccessKey = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(accessKey);
      toast.success('Access key copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy access key:', err);
      toast.error('Failed to copy access key');
    }
  }, [accessKey]);

  const handleGenerateNewKey = useCallback(() => {
    const newKey = generateRandomAccessKey();
    const updatedConfig = { ...config, accessKey: newKey };
    setConfig(updatedConfig);
  }, [config]);

  const handleWebhookSettingChange = useCallback(
    (functionName: string, setting: WebhookSetting) => {
      const updatedConfig: WebhookConfig = {
        ...config,
        publicFunctions: config.publicFunctions?.filter((f) => f !== functionName) || [],
        accessKeyFunctions: config.accessKeyFunctions?.filter((f) => f !== functionName) || [],
      };

      if (setting === 'public') {
        updatedConfig.publicFunctions = [...(updatedConfig.publicFunctions || []), functionName];
      } else if (setting === 'accessKey') {
        updatedConfig.accessKeyFunctions = [...(updatedConfig.accessKeyFunctions || []), functionName];
        // Ensure access key exists
        if (!updatedConfig.accessKey) {
          updatedConfig.accessKey = accessKey;
        }
      }

      setConfig(updatedConfig);
    },
    [config, accessKey],
  );

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(savedConfig);
  }, [config, savedConfig]);

  const handleSaveChanges = useCallback(async () => {
    if (!appId) {
      return;
    }

    setSaving(true);
    try {
      await setWebhookConfig(appId, config);
      setSavedConfig(config);
      toast.success('Webhook settings saved');
    } catch (error) {
      console.error('Failed to save webhook settings:', error);
      toast.error('Failed to save webhook settings');
    } finally {
      setSaving(false);
    }
  }, [appId, config]);

  const functionNames = useMemo(() => {
    const funcs = documentation.functions ? Object.keys(documentation.functions) : [];
    return funcs.sort();
  }, [documentation]);

  const isLoading = loading && appId;
  const hasNoApp = !appId;

  return (
    <div className="@container flex flex-col h-full w-full bg-card rounded-md border border-border overflow-hidden">
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : hasNoApp ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 border border-border">
              <Key className="text-muted-foreground" size={24} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No App Selected</h3>
            <p className="text-muted-foreground text-sm">
              Start a conversation to create an app and configure webhooks.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Webhooks</h2>
                <p className="text-sm text-muted-foreground">
                  Configure which functions can be called via webhooks and their access requirements.
                </p>
              </div>
              <Button onClick={handleSaveChanges} disabled={!hasUnsavedChanges || saving} className="shrink-0">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save size={16} />
                    Save Changes
                  </span>
                )}
              </Button>
            </div>

            {/* Access Key Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Access Key</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-9 px-3 flex items-center bg-background rounded-md border border-border text-sm text-foreground font-mono truncate">
                  {accessKey}
                </div>
                <TooltipProvider>
                  <WithTooltip tooltip="Copy access key">
                    <button
                      onClick={handleCopyAccessKey}
                      className="h-9 w-9 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Copy size={14} />
                    </button>
                  </WithTooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <WithTooltip tooltip="Generate new key">
                    <button
                      onClick={handleGenerateNewKey}
                      disabled={saving}
                      className="h-9 w-9 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw size={14} className={saving ? 'animate-spin' : ''} />
                    </button>
                  </WithTooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this key in the{' '}
                <pre className="inline-block bg-muted rounded-md px-1 py-0.5 text-xs font-mono">X-Access-Key</pre>{' '}
                header to authenticate webhook requests for functions that require access key authentication.
              </p>
            </div>

            {/* Webhooks List */}
            {functionNames.length === 0 ? (
              <div className="p-6 text-center border border-border rounded-md bg-muted">
                <p className="text-sm text-muted-foreground">
                  No webhook functions available. Functions will appear here once they are documented.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Webhook Functions</label>
                <Accordion type="single" collapsible className="w-full space-y-2">
                  {functionNames.map((functionName) => {
                    const currentSetting = getWebhookSetting(functionName, config);
                    const funcDoc = documentation.functions?.[functionName] || 'No documentation available.';

                    return (
                      <AccordionItem
                        key={functionName}
                        value={functionName}
                        className="border border-border rounded-md bg-muted px-4"
                      >
                        <div className="flex items-center justify-between">
                          <AccordionTrigger className="flex-1 text-left hover:no-underline py-4">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm font-medium text-foreground">{functionName}</span>
                            </div>
                          </AccordionTrigger>
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWebhookSettingChange(functionName, 'disabled');
                              }}
                              className={classNames(
                                'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors',
                                currentSetting === 'disabled'
                                  ? 'bg-accent border-borderActive text-foreground'
                                  : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-borderActive',
                              )}
                            >
                              Disabled
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWebhookSettingChange(functionName, 'public');
                              }}
                              className={classNames(
                                'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors',
                                currentSetting === 'public'
                                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-500'
                                  : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-borderActive',
                              )}
                            >
                              Public
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWebhookSettingChange(functionName, 'accessKey');
                              }}
                              className={classNames(
                                'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors',
                                currentSetting === 'accessKey'
                                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-500'
                                  : 'bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-borderActive',
                              )}
                            >
                              Access Key
                            </button>
                          </div>
                        </div>
                        <AccordionContent className="pb-4 pt-2">
                          <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-code:text-foreground">
                            <Markdown>{funcDoc}</Markdown>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
