// Accessors for the API to access saved problems.

import { toast } from 'react-toastify';
import { sendCommandDedicatedClient } from './ReplayProtocolClient';
import type { ProtocolMessage } from './SimulationPrompt';
import Cookies from 'js-cookie';
import JSZip from 'jszip';
import type { FileArtifact } from '~/utils/folderImport';

export interface BoltProblemComment {
  username?: string;
  content: string;
  timestamp: number;
}

export interface BoltProblemSolution {
  simulationData: any;
  messages: ProtocolMessage[];
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
  repositoryContents: string;
  comments?: BoltProblemComment[];
  solution?: BoltProblemSolution;
}

export type BoltProblemInput = Omit<BoltProblem, 'problemId' | 'timestamp'>;

export async function listAllProblems(): Promise<BoltProblemDescription[]> {
  try {
    const rv = await sendCommandDedicatedClient({
      method: 'Recording.globalExperimentalCommand',
      params: {
        name: 'listBoltProblems',
      },
    });
    console.log('ListProblemsRval', rv);

    return (rv as any).rval.problems.reverse();
  } catch (error) {
    console.error('Error fetching problems', error);
    toast.error('Failed to fetch problems');

    return [];
  }
}

export async function getProblem(problemId: string): Promise<BoltProblem | null> {
  try {
    const rv = await sendCommandDedicatedClient({
      method: 'Recording.globalExperimentalCommand',
      params: {
        name: 'fetchBoltProblem',
        params: { problemId },
      },
    });
    console.log('FetchProblemRval', rv);

    const problem = (rv as { rval: { problem: BoltProblem } }).rval.problem;

    if ('prompt' in problem) {
      // 2/11/2025: Update obsolete data format for older problems.
      problem.repositoryContents = (problem as any).prompt.content;
      delete problem.prompt;
    }

    return problem;
  } catch (error) {
    console.error('Error fetching problem', error);
    toast.error('Failed to fetch problem');
  }
  return null;
}

export async function submitProblem(problem: BoltProblemInput): Promise<string | null> {
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

export async function updateProblem(problemId: string, problem: BoltProblemInput | undefined) {
  try {
    if (!getNutIsAdmin()) {
      toast.error('Admin user required');
      return;
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

const nutLoginKeyCookieName = 'nutLoginKey';
const nutIsAdminCookieName = 'nutIsAdmin';

export function getNutLoginKey(): string | undefined {
  const cookieValue = Cookies.get(nutLoginKeyCookieName);
  return cookieValue?.length ? cookieValue : undefined;
}

export function getNutIsAdmin(): boolean {
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
  Cookies.set(nutIsAdminCookieName, userInfo.admin ? 'true' : 'false');
}

export function setNutIsAdmin(isAdmin: boolean) {
  Cookies.set(nutIsAdminCookieName, isAdmin ? 'true' : 'false');
}

const nutProblemsUsernameCookieName = 'nutProblemsUsername';

export function getProblemsUsername(): string | undefined {
  const cookieValue = Cookies.get(nutProblemsUsernameCookieName);
  return cookieValue?.length ? cookieValue : undefined;
}

export function saveProblemsUsername(username: string) {
  Cookies.set(nutProblemsUsernameCookieName, username);
}

export async function extractFileArtifactsFromRepositoryContents(repositoryContents: string): Promise<FileArtifact[]> {
  const zip = new JSZip();
  await zip.loadAsync(repositoryContents, { base64: true });

  const fileArtifacts: FileArtifact[] = [];

  for (const [key, object] of Object.entries(zip.files)) {
    if (object.dir) {
      continue;
    }

    fileArtifacts.push({
      content: await object.async('text'),
      path: key,
    });
  }

  return fileArtifacts;
}

export async function submitFeedback(feedback: any) {
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
