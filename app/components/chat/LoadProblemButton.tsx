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
  try {
    localStorage.setItem('loadedProblem', JSON.stringify(problem));
  } catch (error) {
    console.error('Failed to set last loaded problem:', error);
  }
}

export function getLastLoadedProblem(): BoltProblem | undefined {
  const problemJSON = localStorage.getItem('loadedProblem');

  if (!problemJSON) {
    return undefined;
  }

  return JSON.parse(problemJSON);
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

  const handleSubmit = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
