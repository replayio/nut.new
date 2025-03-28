// Accessors for the API to access saved problems.

import type { Message } from '~/lib/persistence/message';
import {
  supabaseListAllProblems,
  supabaseGetProblem,
  supabaseSubmitProblem,
  supabaseUpdateProblem,
  supabaseSubmitFeedback,
  supabaseDeleteProblem,
} from '~/lib/supabase/problems';
import { getNutIsAdmin as getNutIsAdminFromSupabase } from '~/lib/supabase/client';

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
  repositoryId: string;
  comments?: BoltProblemComment[];
  solution?: BoltProblemSolution;
}

export type BoltProblemInput = Omit<BoltProblem, 'problemId' | 'timestamp'>;

export async function listAllProblems(): Promise<BoltProblemDescription[]> {
  return supabaseListAllProblems();
}

export async function getProblem(problemId: string): Promise<BoltProblem | null> {
  const problem = await supabaseGetProblem(problemId);

  /*
   * Only used for testing
   */
  if (problem) {
    window.__currentProblem__ = problem;
  }

  return problem;
}

export async function submitProblem(problem: BoltProblemInput): Promise<string | null> {
  return supabaseSubmitProblem(problem);
}

export async function deleteProblem(problemId: string): Promise<void | undefined> {
  return supabaseDeleteProblem(problemId);
}

export async function updateProblem(problemId: string, problem: BoltProblemInput): Promise<BoltProblem | null> {
  await supabaseUpdateProblem(problemId, problem);

  const updatedProblem = await getProblem(problemId);

  return updatedProblem;
}

export async function getNutIsAdmin(): Promise<boolean> {
  return getNutIsAdminFromSupabase();
}

export async function submitFeedback(feedback: any): Promise<boolean> {
  return supabaseSubmitFeedback(feedback);
}
