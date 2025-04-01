// Accessors for the API to access saved problems.

import { toast } from 'react-toastify';
import { assert, sendCommandDedicatedClient } from './ReplayProtocolClient';
import type { Message } from '~/lib/persistence/message';

// Add global declaration for the problem property
declare global {
  interface Window {
    __currentProblem__?: NutProblem;
  }
}

export interface NutProblemComment {
  id?: string;
  username?: string;
  content: string;
  timestamp: number;
}

export interface NutProblemSolution {
  simulationData: any;
  messages: Message[];
  evaluator?: string;
}

export enum NutProblemStatus {
  // Problem has been submitted but not yet reviewed.
  Pending = 'Pending',

  // Problem has been reviewed and has not been solved yet.
  Unsolved = 'Unsolved',

  // Nut automatically produces a suitable explanation for solving the problem.
  Solved = 'Solved',
}

// Information about each problem stored in the index file.
export interface NutProblemDescription {
  version: number;
  problemId: string;
  timestamp: number;
  title: string;
  description: string;
  status?: NutProblemStatus;
  keywords?: string[];
}

export interface NutProblem extends NutProblemDescription {
  username?: string;
  user_id?: string;
  repositoryId: string;
  comments?: NutProblemComment[];
  solution?: NutProblemSolution;
}

export type NutProblemInput = Omit<NutProblem, 'problemId' | 'timestamp'>;

export async function listAllProblems(): Promise<NutProblemDescription[]> {
  let problems: NutProblemDescription[] = [];

  try {
    const rv = await sendCommandDedicatedClient({
      method: 'Recording.globalExperimentalCommand',
      params: {
        name: 'listBoltProblems',
      },
    });
    console.log('ListProblemsRval', rv);

    problems = (rv as any).rval.problems.reverse();

    const filteredProblems = problems.filter((problem) => {
      // if ?showAll=true is not in the url, filter out [test] problems
      if (window.location.search.includes('showAll=true')) {
        return true;
      }

      return !problem.title.includes('[test]');
    });

    return filteredProblems;
  } catch (error) {
    console.error('Error fetching problems', error);
    toast.error('Failed to fetch problems');

    return [];
  }
}

export async function getProblem(problemId: string): Promise<NutProblem | null> {
  let problem: NutProblem | null = null;

  try {
    if (!problemId) {
      toast.error('Invalid problem ID');
      return null;
    }

    const rv = await sendCommandDedicatedClient({
      method: 'Recording.globalExperimentalCommand',
      params: {
        name: 'fetchBoltProblem',
        params: { problemId },
      },
    });

    problem = (rv as { rval: { problem: NutProblem } }).rval.problem;

    if (!problem) {
      toast.error('Problem not found');
      return null;
    }

    assert(problem.repositoryId, 'Problem probably has outdated data format. Must have a repositoryId.');
  } catch (error) {
    console.error('Error fetching problem', error);

    // Check for specific protocol error
    if (error instanceof Error && error.message.includes('Unknown problem ID')) {
      toast.error('Problem not found');
    } else {
      toast.error('Failed to fetch problem');
    }
  }

  /*
   * Only used for testing
   */
  if (problem) {
    window.__currentProblem__ = problem;
  }

  return problem;
}
