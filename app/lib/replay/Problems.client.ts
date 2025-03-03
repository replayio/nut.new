// Client-side functionality for Problems - no Supabase dependencies

import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import JSZip from 'jszip';
import type { FileArtifact } from '~/utils/folderImport';
import type { ProtocolMessage } from './SimulationPrompt';

// ========================== Type Definitions ==========================

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

// ========================== Cookie Management ==========================

const nutLoginKeyCookieName = 'nutLoginKey';
const nutIsAdminCookieName = 'nutIsAdmin';
const nutProblemsUsernameCookieName = 'nutProblemsUsername';

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

export async function saveNutLoginKey(key: string): Promise<void> {
  // For simplicity, assume any key with admin=true will be an admin
  const userInfo: UserInfo = {
    username: 'admin',
    loginKey: key,
    details: '',
    admin: true,
  };

  console.log('UserInfo', userInfo);

  Cookies.set(nutLoginKeyCookieName, key);
  Cookies.set(nutIsAdminCookieName, userInfo.admin ? 'true' : 'false');
}

export function setNutIsAdmin(isAdmin: boolean): void {
  Cookies.set(nutIsAdminCookieName, isAdmin ? 'true' : 'false');
}

export function getProblemsUsername(): string | undefined {
  const cookieValue = Cookies.get(nutProblemsUsernameCookieName);
  return cookieValue?.length ? cookieValue : undefined;
}

export function saveProblemsUsername(username: string): void {
  Cookies.set(nutProblemsUsernameCookieName, username);
}

// ========================== Utility Functions ==========================

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

// Client-side error handling helper
export function handleClientError(action: string, error: any): void {
  console.error(`Error ${action}:`, error);
  toast.error(`Failed to ${action}`);
} 