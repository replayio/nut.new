// Client-side functionality for Problems - no Supabase dependencies

import { toast } from 'react-toastify';
import Cookies from 'js-cookie';
import JSZip from 'jszip';
import type { FileArtifact } from '~/utils/folderImport';
import type { BoltProblem, BoltProblemInput } from './types';

// ========================== Cookie Keys ==========================

const PROBLEMS_USERNAME_KEY = 'problems_username';
const NUT_LOGIN_KEY = 'nut_login_key';
const NUT_IS_ADMIN_KEY = 'nut_is_admin';

// ========================== User Management Functions ==========================

export function getNutLoginKey(): string | undefined {
  return Cookies.get(NUT_LOGIN_KEY);
}

export function getNutIsAdmin(): boolean {
  return Cookies.get(NUT_IS_ADMIN_KEY) === 'true';
}

interface UserInfo {
  username: string;
  loginKey: string;
  details: string;
  admin: boolean;
}

export async function saveNutLoginKey(key: string): Promise<void> {
  try {
    const response = await fetch(`/api/auth?key=${encodeURIComponent(key)}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const userInfo: UserInfo = await response.json();

    Cookies.set(NUT_LOGIN_KEY, key);
    Cookies.set(NUT_IS_ADMIN_KEY, String(userInfo.admin));

    if (userInfo.username) {
      saveProblemsUsername(userInfo.username);
    }
  } catch (error) {
    handleClientError('save login key', error);
  }
}

export function setNutIsAdmin(isAdmin: boolean): void {
  Cookies.set(NUT_IS_ADMIN_KEY, String(isAdmin));
}

export function getProblemsUsername(): string | undefined {
  return Cookies.get(PROBLEMS_USERNAME_KEY);
}

export function saveProblemsUsername(username: string): void {
  Cookies.set(PROBLEMS_USERNAME_KEY, username);
}

// ========================== Helper Functions ==========================

export async function extractFileArtifactsFromRepositoryContents(repositoryContents: string): Promise<FileArtifact[]> {
  try {
    const zip = await JSZip.loadAsync(repositoryContents, { base64: true });
    const artifacts: FileArtifact[] = [];

    for (const [path, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        const content = await file.async('string');
        artifacts.push({ path, content });
      }
    }

    return artifacts;
  } catch (error) {
    handleClientError('extract repository contents', error);
    return [];
  }
}

export function handleClientError(action: string, error: any): void {
  console.error(`Error during ${action}:`, error);
  toast.error(`Error during ${action}: ${error.message || 'Unknown error'}`);
}
