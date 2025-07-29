import { useState, useEffect } from 'react';
import { database } from '~/lib/persistence/apps';
import { AppUpdateReasonKind, type AppSummary, type AppUpdateReason } from '~/lib/persistence/messageAppSummary';
import { chatStore } from '~/lib/stores/chat';
import { assert } from '~/utils/nut';
import { getRepositoryURL } from '~/lib/replay/DevelopmentServer';

function includeHistorySummary(summary: AppSummary): boolean {
  if (!summary.reason) {
    return false;
  }
  switch (summary.reason.kind) {
    case AppUpdateReasonKind.MockupValidated:
    case AppUpdateReasonKind.FeatureImplemented:
    case AppUpdateReasonKind.FeatureValidated:
    case AppUpdateReasonKind.RevertApp:
      return true;
    default:
      return false;
  }
}

const AppHistory = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<AppSummary[]>([]);

  const appId = chatStore.currentAppId.get();
  assert(appId, 'App ID is required');

  useEffect(() => {
    if (!loading) {
      return;
    }
    const fetchHistory = async () => {
      const history = await database.getAppHistory(appId);
      setHistory(history.filter(includeHistorySummary));
      setLoading(false);
    };
    fetchHistory();
  }, [loading]);

  const formatUTCTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toISOString();
    } catch (_) {
      return timeString; // fallback to original string if parsing fails
    }
  };

  const renderUpdateReason = (reason: AppUpdateReason | undefined, history: AppSummary[]) => {
    assert(reason, 'Reason is required');
    switch (reason.kind) {
      case AppUpdateReasonKind.MockupValidated:
        return 'Mockup completed';
      case AppUpdateReasonKind.FeatureImplemented:
        return `Feature implemented: ${reason.featureName}`;
      case AppUpdateReasonKind.FeatureValidated:
        return `Feature completed: ${reason.featureName}`;
      case AppUpdateReasonKind.RevertApp: {
        const targetSummary = history.find((summary) => summary.iteration === reason.iteration);
        assert(targetSummary, 'Target summary not found');
        return `Reverted to version: ${targetSummary.version}`;
      }
      default:
        return 'Unknown reason';
    }
  };

  const handleOpenPreview = (summary: AppSummary) => {
    window.open(getRepositoryURL(summary.repositoryId), '_blank');
  };

  const handleRevertToVersion = async (summary: AppSummary) => {
    await database.revertApp(appId, summary.iteration);
    setLoading(true);
  };

  return (
    <div>
      <div className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary">History</div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {history.map((summary, index) => (
            <div
              key={index}
              className="border border-bolt-elements-border rounded-lg p-4 bg-bolt-elements-surfaceSecondary"
            >
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-bolt-elements-textPrimary">{`${summary.version || 'N/A'}:`}</span>
                  <span className="text-bolt-elements-textPrimary font-mono">{formatUTCTime(summary.time)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-bolt-elements-textPrimary font-mono text-xs bg-bolt-elements-surfacePrimary p-2 rounded overflow-x-auto">
                    {renderUpdateReason(summary.reason, history)}
                  </span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleOpenPreview(summary)}
                    className="px-3 py-1 text-xs bg-bolt-elements-surfacePrimary hover:bg-bolt-elements-surfacePrimaryHover text-bolt-elements-textPrimary rounded border border-bolt-elements-border transition-colors"
                  >
                    Open Preview
                  </button>
                  <button
                    onClick={() => handleRevertToVersion(summary)}
                    className="px-3 py-1 text-xs bg-bolt-elements-surfacePrimary hover:bg-bolt-elements-surfacePrimaryHover text-bolt-elements-textPrimary rounded border border-bolt-elements-border transition-colors"
                  >
                    Revert to Version
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppHistory;
