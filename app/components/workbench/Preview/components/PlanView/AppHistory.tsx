import { useState, useEffect } from "react";
import { database } from "~/lib/persistence/apps";
import type { AppSummary } from "~/lib/persistence/messageAppSummary";
import { chatStore } from "~/lib/stores/chat";
import { assert } from "~/utils/nut";

const AppHistory = () => {
  const [loading, setLoading] = useState(true); 
  const [history, setHistory] = useState<AppSummary[]>([]);

  const appId = chatStore.currentAppId.get();
  assert(appId, 'App ID is required');

  useEffect(() => {
    const fetchHistory = async () => {
      const history = await database.getAppHistory(appId);
      setHistory(history);
      setLoading(false);
    };
    fetchHistory();
  }, []);

  const formatUTCTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toISOString();
    } catch (error) {
      return timeString; // fallback to original string if parsing fails
    }
  };

  return (
    <div>
      <div className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary">History</div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {history.map((summary, index) => (
            <div key={index} className="border border-bolt-elements-border rounded-lg p-4 bg-bolt-elements-surfaceSecondary">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-bolt-elements-textSecondary">UTC Time:</span>
                  <span className="text-bolt-elements-textPrimary font-mono">{formatUTCTime(summary.time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-bolt-elements-textSecondary">Version:</span>
                  <span className="text-bolt-elements-textPrimary">{summary.version || 'N/A'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-bolt-elements-textSecondary">Update Reason:</span>
                  <pre className="text-bolt-elements-textPrimary font-mono text-xs bg-bolt-elements-surfacePrimary p-2 rounded overflow-x-auto">
                    {JSON.stringify(summary.reason, null, 2) || 'N/A'}
                  </pre>
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
