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
  return supabaseListAllProblems();
}

export async function getProblem(problemId: string): Promise<NutProblem | null> {
  const problem = await supabaseGetProblem(problemId);

  /*
   * Only used for testing
   */
  if (problem) {
    window.__currentProblem__ = problem;
  }

  return problem;
}

export async function submitProblem(problem: NutProblemInput): Promise<string | null> {
  return supabaseSubmitProblem(problem);
}

export async function deleteProblem(problemId: string): Promise<void | undefined> {
  return supabaseDeleteProblem(problemId);
}

export async function updateProblem(problemId: string, problem: NutProblemInput): Promise<NutProblem | null> {
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
