import { getPeanutsHistory, type PeanutHistoryEntry } from "~/lib/replay/Account";
import { useState, useEffect } from "react";

export const UsageModal = () => {
  const [history, setHistory] = useState<PeanutHistoryEntry[]>([]);
  useEffect(() => {
    getPeanutsHistory().then(setHistory);
  }, []);

  const renderHistoryItem = (item: PeanutHistoryEntry) => {
    return (
      <div key={item.time}>
        <p>{item.peanutsDelta} peanuts {item.reason}</p>
      </div>
    );
  };

  return (
    <div
      className="bg-bolt-elements-background-depth-1 rounded-lg p-8 max-w-2xl w-full z-50 border border-bolt-elements-borderColor overflow-y-auto max-h-[95vh]"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-2xl font-bold mb-6 text-bolt-elements-textPrimary text-center">
        Peanut Usage
      </h2>
      {history.map(renderHistoryItem)}
    </div>
  );
}
