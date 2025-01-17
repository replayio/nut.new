import React, { useState } from 'react';
import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { createChatFromFolder, type FileArtifact } from '~/utils/folderImport';
import { logStore } from '~/lib/stores/logs'; // Assuming logStore is imported from this location
import { assert, sendCommandDedicatedClient } from '~/lib/replay/ReplayProtocolClient';
import type { BoltProblem } from '~/components/sidebar/SaveProblem';
import JSZip from 'jszip';

interface LoadProblemButtonProps {
  className?: string;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
}

export async function loadProblem(problemId: string, importChat: (description: string, messages: Message[]) => Promise<void>) {
  let problem: BoltProblem | null = null;
  try {
    const rv = await sendCommandDedicatedClient({
      method: "Recording.globalExperimentalCommand",
      params: {
        name: "fetchBoltProblem",
        params: { problemId },
      },
    });
    console.log("FetchProblemRval", rv);
    problem = (rv as { rval: BoltProblem }).rval;
  } catch (error) {
    console.error("Error fetching problem", error);
    toast.error("Failed to fetch problem");
  }

  if (!problem) {
    return;
  }

  const problemContents = problem.prompt.content;
  const problemTitle = problem.title;

  const zip = new JSZip();
  await zip.loadAsync(problemContents, { base64: true });

  const fileArtifacts: FileArtifact[] = [];
  for (const [key, object] of Object.entries(zip.files)) {
    if (object.dir) continue;
    fileArtifacts.push({
      content: await object.async('text'),
      path: key,
    });
  }

  try {
    const messages = await createChatFromFolder(fileArtifacts, [], "problem");
    await importChat(`Problem: ${problemTitle}`, [...messages]);

    logStore.logSystem('Problem loaded successfully', {
      problemId,
      textFileCount: fileArtifacts.length,
    });
    toast.success('Problem loaded successfully');
  } catch (error) {
    logStore.logError('Failed to load problem', error);
    console.error('Failed to load problem:', error);
    toast.error('Failed to load problem');
  }
}

export const LoadProblemButton: React.FC<LoadProblemButtonProps> = ({ className, importChat }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(false);

  const handleSubmit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true);
    setIsInputOpen(false);

    const problemId = (document.getElementById('problem-input') as HTMLInputElement)?.value;

    assert(importChat, "importChat is required");
    await loadProblem(problemId, importChat);
    setIsLoading(false);
  };

  return (
    <>
      {isInputOpen && (
        <input
          id="problem-input"
          type="text"
          webkitdirectory=""
          directory=""
          onChange={() => {}}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit(e as any);
            }
          }}
          className="border border-gray-300 rounded px-2 py-1"
          {...({} as any)}
        />
      )}
      {!isInputOpen && (
        <button
          onClick={() => {
            setIsInputOpen(true);
          }}
          className={className}
          disabled={isLoading}
        >
          <div className="i-ph:globe" />
          {isLoading ? 'Loading...' : 'Load Problem'}
        </button>
      )}
    </>
  );
};
