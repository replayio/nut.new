import React from 'react';
import { Switch } from '~/components/ui/Switch';
import { useSettings } from '~/lib/hooks/useSettings';

export default function FeaturesTab() {
  const {
    debug,
    enableDebugMode,
    isLocalModel,
    enableLocalModels,
    enableEventLogs,
    isLatestBranch,
    enableLatestBranch,

    // Unused variables but needed from useSettings
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    promptId,
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    setPromptId,
    autoSelectTemplate,
    setAutoSelectTemplate,
    enableContextOptimization,
    contextOptimizationEnabled,
  } = useSettings();

  const handleToggle = (enabled: boolean) => {
    enableDebugMode(enabled);
    enableEventLogs(enabled);
  };

  return (
    <div className="p-4 bg-bolt-elements-bg-depth-2 border border-bolt-elements-borderColor rounded-lg mb-4">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-4">Optional Features</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-bolt-elements-textPrimary">Debug Features</span>
            <Switch className="ml-auto" checked={debug} onCheckedChange={handleToggle} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-bolt-elements-textPrimary">Use Main Branch</span>
              <p className="text-xs text-bolt-elements-textTertiary">
                Check for updates against the main branch instead of stable
              </p>
            </div>
            <Switch className="ml-auto" checked={isLatestBranch} onCheckedChange={enableLatestBranch} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-bolt-elements-textPrimary">Auto Select Code Template</span>
              <p className="text-xs text-bolt-elements-textTertiary">
                Let Bolt select the best starter template for your project.
              </p>
            </div>
            <Switch className="ml-auto" checked={autoSelectTemplate} onCheckedChange={setAutoSelectTemplate} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-bolt-elements-textPrimary">Use Context Optimization</span>
              <p className="text-sm text-bolt-elements-textSecondary">
                redact file contents form chat and puts the latest file contents on the system prompt
              </p>
            </div>
            <Switch
              className="ml-auto"
              checked={contextOptimizationEnabled}
              onCheckedChange={enableContextOptimization}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 border-t border-bolt-elements-borderColor pt-4">
        <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-4">Experimental Features</h3>
        <p className="text-sm text-bolt-elements-textSecondary mb-10">
          Disclaimer: Experimental features may be unstable and are subject to change.
        </p>
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-bolt-elements-textPrimary">Experimental Providers</span>
            <Switch className="ml-auto" checked={isLocalModel} onCheckedChange={enableLocalModels} />
          </div>
          <p className="text-xs text-bolt-elements-textTertiary mb-4">
            Enable experimental providers such as Ollama, LMStudio, and OpenAILike.
          </p>
        </div>
      </div>
    </div>
  );
}
