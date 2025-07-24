import { useSearchParams } from "@remix-run/react";
import { downloadRepository } from "~/lib/replay/Deploy";
import { useEffect } from "react";

function RepositoryDiff() {
  const [searchParams] = useSearchParams();
  const oldRepositoryId = searchParams.get("old");
  const newRepositoryId = searchParams.get("new");

  useEffect(() => {
    (async () => {
      if (!oldRepositoryId || !newRepositoryId) {
        return;
      }

      const oldRepositoryContents = await downloadRepository(oldRepositoryId);
      const newRepositoryContents = await downloadRepository(newRepositoryId);

      console.log(oldRepositoryContents);
      console.log(newRepositoryContents);
    })();
  }, [oldRepositoryId, newRepositoryId]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Repository Diff</h1>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Repository IDs</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Old Repository ID:
              </label>
              <div className="p-3 bg-gray-100 rounded border font-mono text-sm">
                {oldRepositoryId || "Not provided"}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Repository ID:
              </label>
              <div className="p-3 bg-gray-100 rounded border font-mono text-sm">
                {newRepositoryId || "Not provided"}
              </div>
            </div>
          </div>
        </div>
        
        {oldRepositoryId && newRepositoryId && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Diff Information</h2>
            <p className="text-gray-600">
              Comparing repository <span className="font-mono">{oldRepositoryId}</span> with <span className="font-mono">{newRepositoryId}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RepositoryDiff;
