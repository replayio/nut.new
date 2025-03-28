// Accessors for the API to access saved problems.

import { toast } from 'react-toastify';
import { assert, sendCommandDedicatedClient } from './ReplayProtocolClient';
import type { Message } from '~/lib/persistence/message';
import Cookies from 'js-cookie';
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

const nutLoginKeyCookieName = 'nutLoginKey';
const nutIsAdminCookieName = 'nutIsAdmin';
const nutUsernameCookieName = 'nutUsername';

export async function updateProblem(problemId: string, problem: BoltProblemInput): Promise<BoltProblem | null> {
  await supabaseUpdateProblem(problemId, problem);

  const updatedProblem = await getProblem(problemId);

  return updatedProblem;
}

export function getNutLoginKey(): string | undefined {
  const cookieValue = Cookies.get(nutLoginKeyCookieName);
  return cookieValue?.length ? cookieValue : undefined;
}

export async function getNutIsAdmin(): Promise<boolean> {
  return getNutIsAdminFromSupabase();
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
  return supabaseSubmitFeedback(feedback);
}
