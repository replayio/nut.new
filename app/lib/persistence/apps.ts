// All apps are stored in the database. Before logging in or creating an account
// we store the IDs of any apps created in local storage. The first time the user logs in,
// any local apps are associated with the user and then local storage is cleared.

import { getCurrentUserId } from '~/lib/supabase/client';
import type { DeploySettingsDatabase } from '~/lib/replay/Deploy';
import { callNutAPI } from '~/lib/replay/NutAPI';
import type { AppSummary } from './messageAppSummary';

// Basic information about an app for showing in the library.
export interface AppEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
}

const localStorageKey = 'nut-apps';

function getLocalAppIds(): string[] {
  const appIdsJSON = localStorage.getItem(localStorageKey);
  if (!appIdsJSON) {
    return [];
  }
  return JSON.parse(appIdsJSON);
}

function setLocalAppIds(appIds: string[] | undefined): void {
  if (appIds?.length) {
    localStorage.setItem(localStorageKey, JSON.stringify(appIds));
  } else {
    localStorage.removeItem(localStorageKey);
  }
}

// Apps we've deleted locally. We never return these from the database afterwards
// to present a coherent view of the apps in case the apps are queried before the
// delete finishes.
const deletedAppIds = new Set<string>();

async function getAllAppEntries(): Promise<AppEntry[]> {
  const userId = await getCurrentUserId();
  const localAppIds = getLocalAppIds();

  if (!userId) {
    const { entries } = await callNutAPI('get-app-entries', {
      appIds: localAppIds,
    });
    return entries;
  }

  if (localAppIds.length) {
    try {
      for (const appId of localAppIds) {
        await setAppOwner(appId, userId);
      }
      setLocalAppIds(undefined);
    } catch (error) {
      console.error('Error syncing local apps', error);
    }
  }

  const { entries } = await callNutAPI('get-user-app-entries', {
    userId,
  });

  return entries.filter((entry: AppEntry) => !deletedAppIds.has(entry.id));
}

async function setAppOwner(appId: string, userId: string): Promise<void> {
  await callNutAPI("set-app-owner", { appId, userId });
}

async function getAppContents(appId: string): Promise<AppSummary | undefined> {
  const userId = await getCurrentUserId();

  const { appSummary } = await callNutAPI('get-app-summary', {
    userId,
    appId,
  });
  return appSummary;
}

async function deleteApp(appId: string): Promise<void> {
  deletedAppIds.add(appId);

  const userId = await getCurrentUserId();

  if (!userId) {
    const localAppIds = getLocalAppIds().filter((id) => id != appId);
    setLocalAppIds(localAppIds);
    return;
  }

  await callNutAPI('delete-app', {
    userId,
    appId,
  });
}

async function createApp(): Promise<string> {
  const userId = await getCurrentUserId();
  const { appId } = await callNutAPI('create-app', { userId });
  if (!userId) {
    const localAppIds = getLocalAppIds();
    localAppIds.push(appId);
    setLocalAppIds(localAppIds);
  }
  return appId;
}

async function updateAppTitle(appId: string, title: string): Promise<void> {
  if (!title.trim()) {
    throw new Error('Title cannot be empty');
  }

  const userId = await getCurrentUserId();
  await callNutAPI('set-app-title', { userId, appId, title });
}

async function getAppDeploySettings(appId: string): Promise<DeploySettingsDatabase | undefined> {
  console.log('DatabaseGetAppDeploySettingsStart', appId);

  const userId = await getCurrentUserId();
  const { deploySettings } = await callNutAPI('get-app-deploy-settings', { userId, appId });
  return deploySettings;
}

async function setAppDeploySettings(appId: string, deploySettings: DeploySettingsDatabase): Promise<void> {
  const userId = await getCurrentUserId();
  await callNutAPI('set-app-deploy-settings', { userId, appId, deploySettings });
}

async function abortAppChats(appId: string): Promise<void> {
  const userId = await getCurrentUserId();
  await callNutAPI('abort-app-chats', { userId, appId });
}

export const database = {
  getAllAppEntries,
  getAppContents,
  deleteApp,
  createApp,
  updateAppTitle,
  getAppDeploySettings,
  setAppDeploySettings,
  abortAppChats,
};
