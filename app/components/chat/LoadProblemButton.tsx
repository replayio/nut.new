import React, { useState } from 'react';
import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { createChatFromFolder } from '~/utils/folderImport';
import { logStore } from '~/lib/stores/logs'; // Assuming logStore is imported from this location
import { assert } from '~/lib/replay/ReplayProtocolClient';
import type { BoltProblem } from '~/lib/replay/Problems';
import { getProblem, extractFileArtifactsFromRepositoryContents } from '~/lib/replay/Problems';

interface LoadProblemButtonProps {
  className?: string;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
}

export function setLastLoadedProblem(problem: BoltProblem) {
  const problemSerialized = JSON.stringify(problem);

  try {
    localStorage.setItem('loadedProblemId', problem.problemId);
    localStorage.setItem('loadedProblem', problemSerialized);
  } catch (error: any) {
    // Remove loadedProblem, so we don't accidentally associate a solution with the wrong problem.
    localStorage.removeItem('loadedProblem');
    console.error(
      `Failed to set last loaded problem (size=${(problemSerialized.length / 1024).toFixed(2)}kb):`,
      error.stack || error,
    );
  }
}

export async function getOrFetchLastLoadedProblem(): Promise<BoltProblem | null> {
  const problemJSON = localStorage.getItem('loadedProblem');
  let problem: BoltProblem | null = null;

  if (problemJSON) {
    problem = JSON.parse(problemJSON);
  } else {
    /*
     * Problem might not have fit into localStorage.
     * Try to re-load it from server.
     */
    const problemId = localStorage.getItem('loadedProblemId');

    if (!problemId) {
      return null;
    }

    problem = await getProblem(problemId);

    if (!problem) {
      return null;
    }

    setLastLoadedProblem(problem);
  }

  return problem;
}

export async function loadProblem(
  problemId: string,
  importChat: (description: string, messages: Message[]) => Promise<void>,
) {
  const problem = await getProblem(problemId);

  if (!problem) {
    return;
  }

  setLastLoadedProblem(problem);

  const { repositoryContents, title: problemTitle } = problem;

  const fileArtifacts = await extractFileArtifactsFromRepositoryContents(repositoryContents);

  try {
    const messages = await createChatFromFolder(fileArtifacts, [], 'problem');
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

  const handleSubmit = async (_e: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true);
    setIsInputOpen(false);

    const problemId = (document.getElementById('problem-input') as HTMLInputElement)?.value;

    assert(importChat, 'importChat is required');
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
          onChange={(_e) => {
            /* Input change handled by onKeyDown */
          }}
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
