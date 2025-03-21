import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { createChatFromFolder } from '~/utils/folderImport';
import { logStore } from '~/lib/stores/logs';
import { assert } from '~/lib/replay/ReplayProtocolClient';
import type { BoltProblem } from '~/lib/replay/Problems';
import { getProblem } from '~/lib/replay/Problems';
import { createRepositoryImported } from '~/lib/replay/Repository';
import type { Message } from '~/lib/persistence/message';

interface LoadProblemButtonProps {
  className?: string;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
}

export function setLastLoadedProblem(problem: BoltProblem) {
  localStorage.setItem('loadedProblemId', problem.problemId);
}

export async function getOrFetchLastLoadedProblem(): Promise<BoltProblem | null> {
  let problem: BoltProblem | null = null;
  const problemId = localStorage.getItem('loadedProblemId');

  if (!problemId) {
    return null;
  }

  problem = await getProblem(problemId);

  if (!problem) {
    return null;
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

  try {
    const repositoryId = await createRepositoryImported(`ImportProblem:${problemId}`, repositoryContents);
    const messages = createChatFromFolder('problem', repositoryId);
    await importChat(`Problem: ${problemTitle}`, [...messages]);

    logStore.logSystem('Problem loaded successfully', {
      problemId,
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
