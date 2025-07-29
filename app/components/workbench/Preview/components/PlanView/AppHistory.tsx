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

  return (
    <div>
      <div className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary">History</div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>{history.map((summary, index) => <div key={index}>{summary.version}</div>)}</div>
      )}
    </div>
  );
};

export default AppHistory;
