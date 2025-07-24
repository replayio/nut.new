import { useSearchParams } from "@remix-run/react";
import { downloadRepository } from "~/lib/replay/Deploy";
import { useEffect, useState } from "react";
import JSZip from "jszip";
import { diffLines } from "diff";

interface FileDiff {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  oldContent?: string;
  newContent?: string;
  diff?: string;
}

interface RepositoryFiles {
  [path: string]: string;
}

function computeDiff(oldContent: string, newContent: string): string {
  const diffResult = diffLines(oldContent, newContent, {
    ignoreCase: false,
    ignoreWhitespace: false
  });
  
  let diff = '';
  diffResult.forEach(part => {
    if (part.added) {
      diff += part.value.split('\n').map(line => `+${line}`).join('\n') + '\n';
    } else if (part.removed) {
      diff += part.value.split('\n').map(line => `-${line}`).join('\n') + '\n';
    } else {
      diff += part.value.split('\n').map(line => ` ${line}`).join('\n') + '\n';
    }
  });
  
  return diff;
}

async function extractRepositoryFiles(base64Content: string): Promise<RepositoryFiles> {
  try {
    const zip = new JSZip();
    const zipData = atob(base64Content);
    const zipBuffer = new Uint8Array(zipData.length);
    for (let i = 0; i < zipData.length; i++) {
      zipBuffer[i] = zipData.charCodeAt(i);
    }
    
    const loadedZip = await zip.loadAsync(zipBuffer);
    const files: RepositoryFiles = {};
    
    for (const [path, file] of Object.entries(loadedZip.files)) {
      if (!file.dir) {
        const content = await file.async('string');
        files[path] = content;
      }
    }
    
    return files;
  } catch (error) {
    console.error('Error extracting repository:', error);
    return {};
  }
}

function compareRepositories(oldFiles: RepositoryFiles, newFiles: RepositoryFiles): FileDiff[] {
  const allPaths = new Set([...Object.keys(oldFiles), ...Object.keys(newFiles)]);
  const diffs: FileDiff[] = [];
  
  for (const path of allPaths) {
    const oldContent = oldFiles[path];
    const newContent = newFiles[path];
    
    if (!oldContent && newContent) {
      // File was added
      diffs.push({
        path,
        type: 'added',
        newContent,
        diff: newContent.split('\n').map(line => `+${line}`).join('\n')
      });
    } else if (oldContent && !newContent) {
      // File was deleted
      diffs.push({
        path,
        type: 'deleted',
        oldContent,
        diff: oldContent.split('\n').map(line => `-${line}`).join('\n')
      });
    } else if (oldContent !== newContent) {
      // File was modified
      diffs.push({
        path,
        type: 'modified',
        oldContent,
        newContent,
        diff: computeDiff(oldContent, newContent)
      });
    }
  }
  
  return diffs;
}

function RepositoryDiff() {
  const [searchParams] = useSearchParams();
  const oldRepositoryId = searchParams.get("old");
  const newRepositoryId = searchParams.get("new");
  const [diffs, setDiffs] = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!oldRepositoryId || !newRepositoryId) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const oldRepositoryContents = await downloadRepository(oldRepositoryId);
        const newRepositoryContents = await downloadRepository(newRepositoryId);

        const oldFiles = await extractRepositoryFiles(oldRepositoryContents);
        const newFiles = await extractRepositoryFiles(newRepositoryContents);

        const fileDiffs = compareRepositories(oldFiles, newFiles);
        setDiffs(fileDiffs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load repositories');
      } finally {
        setLoading(false);
      }
    })();
  }, [oldRepositoryId, newRepositoryId]);

  const getDiffTypeColor = (type: string) => {
    switch (type) {
      case 'added': return 'text-green-600 bg-green-50';
      case 'deleted': return 'text-red-600 bg-red-50';
      case 'modified': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getDiffTypeIcon = (type: string) => {
    switch (type) {
      case 'added': return '➕';
      case 'deleted': return '❌';
      case 'modified': return '✏️';
      default: return '📄';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Repository Diff</h1>
      
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Repository IDs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Old Repository ID:
              </label>
              <div className="p-3 bg-gray-100 rounded border font-mono text-sm break-all">
                {oldRepositoryId || "Not provided"}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Repository ID:
              </label>
              <div className="p-3 bg-gray-100 rounded border font-mono text-sm break-all">
                {newRepositoryId || "Not provided"}
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading repositories...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-600">⚠️</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && diffs.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">File Changes ({diffs.length})</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {diffs.map((diff, index) => (
                <div key={index} className="p-6">
                  <div className="flex items-center mb-4">
                    <span className="mr-2">{getDiffTypeIcon(diff.type)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDiffTypeColor(diff.type)}`}>
                      {diff.type.toUpperCase()}
                    </span>
                    <span className="ml-3 font-mono text-sm text-gray-900">{diff.path}</span>
                  </div>
                  
                  {diff.diff && (
                    <div className="bg-gray-50 rounded border overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 border-b">
                        <span className="text-sm font-medium text-gray-700">Diff</span>
                      </div>
                      <pre className="p-4 text-sm overflow-x-auto whitespace-pre-wrap">
                        <code className="font-mono">
                          {diff.diff}
                        </code>
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && diffs.length === 0 && oldRepositoryId && newRepositoryId && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center text-gray-500">
              <p>No differences found between the repositories.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RepositoryDiff;
