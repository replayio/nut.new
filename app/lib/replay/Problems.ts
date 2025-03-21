// Accessors for the API to access saved problems.

import { toast } from 'react-toastify';
import { sendCommandDedicatedClient } from './ReplayProtocolClient';
import type { Message } from '~/lib/persistence/message';
import Cookies from 'js-cookie';
import { shouldUseSupabase } from '~/lib/supabase/client';
import {
  supabaseListAllProblems,
  supabaseGetProblem,
  supabaseSubmitProblem,
  supabaseUpdateProblem,
  supabaseSubmitFeedback,
  supabaseDeleteProblem,
} from '~/lib/supabase/problems';
import { getNutIsAdmin as getNutIsAdminFromSupabase } from '~/lib/supabase/client';
import { updateIsAdmin, updateUsername } from '~/lib/stores/user';

// Add global declaration for the problem property
declare global {
  interface Window {
    __currentProblem__?: BoltProblem;
  }
}

export interface BoltProblemComment {
  id?: string;
  username?: string;
  content: string;
  timestamp: number;
}

export interface BoltProblemSolution {
  simulationData: any;
  messages: Message[];
  evaluator?: string;
}

export enum BoltProblemStatus {
  // Problem has been submitted but not yet reviewed.
  Pending = 'Pending',

  // Problem has been reviewed and has not been solved yet.
  Unsolved = 'Unsolved',

  // Nut automatically produces a suitable explanation for solving the problem.
  Solved = 'Solved',
}

// Information about each problem stored in the index file.
export interface BoltProblemDescription {
  version: number;
  problemId: string;
  timestamp: number;
  title: string;
  description: string;
  status?: BoltProblemStatus;
  keywords?: string[];
}

export interface BoltProblem extends BoltProblemDescription {
  username?: string;
  user_id?: string;
  repositoryContents: string;
  comments?: BoltProblemComment[];
  solution?: BoltProblemSolution;
}

export type BoltProblemInput = Omit<BoltProblem, 'problemId' | 'timestamp'>;

export async function listAllProblems(): Promise<BoltProblemDescription[]> {
  let problems: BoltProblemDescription[] = [];

  if (shouldUseSupabase()) {
    problems = await supabaseListAllProblems();
  } else {
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

  return problems;
}

export async function getProblem(problemId: string): Promise<BoltProblem | null> {
  let problem: BoltProblem | null = null;

  if (shouldUseSupabase()) {
    problem = await supabaseGetProblem(problemId);
  } else {
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

      problem = (rv as { rval: { problem: BoltProblem } }).rval.problem;

      if (!problem) {
        toast.error('Problem not found');
        return null;
      }

      if ('prompt' in problem) {
        // 2/11/2025: Update obsolete data format for older problems.
        problem.repositoryContents = (problem as any).prompt.content;
        delete problem.prompt;
      }
    } catch (error) {
      console.error('Error fetching problem', error);

      // Check for specific protocol error
      if (error instanceof Error && error.message.includes('Unknown problem ID')) {
        toast.error('Problem not found');
      } else {
        toast.error('Failed to fetch problem');
      }
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

export async function submitProblem(problem: BoltProblemInput): Promise<string | null> {
  if (shouldUseSupabase()) {
    return supabaseSubmitProblem(problem);
  }

  try {
    const rv = await sendCommandDedicatedClient({
      method: 'Recording.globalExperimentalCommand',
      params: {
        name: 'submitBoltProblem',
        params: { problem },
      },
    });
    console.log('SubmitProblemRval', rv);

    return (rv as any).rval.problemId;
  } catch (error) {
    console.error('Error submitting problem', error);
    toast.error('Failed to submit problem');

    return null;
  }
}

export async function deleteProblem(problemId: string): Promise<void | undefined> {
  if (shouldUseSupabase()) {
    return supabaseDeleteProblem(problemId);
  }

  return undefined;
}

const nutLoginKeyCookieName = 'nutLoginKey';
const nutIsAdminCookieName = 'nutIsAdmin';
const nutUsernameCookieName = 'nutUsername';

export async function updateProblem(problemId: string, problem: BoltProblemInput): Promise<BoltProblem | null> {
  if (shouldUseSupabase()) {
    await supabaseUpdateProblem(problemId, problem);
  } else {
    try {
      if (!getNutIsAdmin()) {
        toast.error('Admin user required');

        return null;
      }

      const loginKey = Cookies.get(nutLoginKeyCookieName);
      await sendCommandDedicatedClient({
        method: 'Recording.globalExperimentalCommand',
        params: {
          name: 'updateBoltProblem',
          params: { problemId, problem, loginKey },
        },
      });
    } catch (error) {
      console.error('Error updating problem', error);
      toast.error('Failed to update problem');
    }
  }

  const updatedProblem = await getProblem(problemId);

  return updatedProblem;
}

export function getNutLoginKey(): string | undefined {
  const cookieValue = Cookies.get(nutLoginKeyCookieName);
  return cookieValue?.length ? cookieValue : undefined;
}

export async function getNutIsAdmin(): Promise<boolean> {
  if (shouldUseSupabase()) {
    return getNutIsAdminFromSupabase();
  }

  return Cookies.get(nutIsAdminCookieName) === 'true';
}

interface UserInfo {
  username: string;
  loginKey: string;
  details: string;
  admin: boolean;
}

export async function saveNutLoginKey(key: string) {
  const {
    rval: { userInfo },
  } = (await sendCommandDedicatedClient({
    method: 'Recording.globalExperimentalCommand',
    params: {
      name: 'getUserInfo',
      params: { loginKey: key },
    },
  })) as { rval: { userInfo: UserInfo } };
  console.log('UserInfo', userInfo);

  Cookies.set(nutLoginKeyCookieName, key);
  setNutIsAdmin(userInfo.admin);
}

export function setNutIsAdmin(isAdmin: boolean) {
  Cookies.set(nutIsAdminCookieName, isAdmin ? 'true' : 'false');

  // Update the store
  updateIsAdmin(isAdmin);
}

export function getUsername(): string | undefined {
  const cookieValue = Cookies.get(nutUsernameCookieName);
  return cookieValue?.length ? cookieValue : undefined;
}

export function saveUsername(username: string) {
  Cookies.set(nutUsernameCookieName, username);

  // Update the store
  updateUsername(username);
}

export async function submitFeedback(feedback: any): Promise<boolean> {
  if (shouldUseSupabase()) {
    return supabaseSubmitFeedback(feedback);
  }

  try {
    const rv = await sendCommandDedicatedClient({
      method: 'Recording.globalExperimentalCommand',
      params: {
        name: 'submitFeedback',
        params: { feedback },
      },
    });
    console.log('SubmitFeedbackRval', rv);

    return true;
  } catch (error) {
    console.error('Error submitting feedback', error);
    toast.error('Failed to submit feedback');

    return false;
  }
}
