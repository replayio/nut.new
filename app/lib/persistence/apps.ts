// All apps are stored in the database. Before logging in or creating an account
// we store the IDs of any apps created in local storage. The first time the user logs in,
// any local apps are associated with the user and then local storage is cleared.

import { getCurrentUserId } from '~/lib/supabase/client';
import type { DeploySettingsDatabase } from '~/lib/replay/Deploy';
import { callNutAPI } from '~/lib/replay/NutAPI';
import type { AppSummary } from './messageAppSummary';
import type { Message } from './message';

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
        await setAppOwner(appId);
      }
      setLocalAppIds(undefined);
    } catch (error) {
      console.error('Error syncing local apps', error);
    }
  }

  const { entries } = await callNutAPI('get-user-app-entries', {});

  return entries.filter((entry: AppEntry) => !deletedAppIds.has(entry.id));
}

async function setAppOwner(appId: string): Promise<void> {
  await callNutAPI('set-app-owner', { appId });
}

async function getAppContents(appId: string): Promise<AppSummary | undefined> {
  const { appSummary } = await callNutAPI('get-app-summary', { appId });
  return appSummary;
}

async function deleteApp(appId: string): Promise<void> {
  deletedAppIds.add(appId);

  const userId = await getCurrentUserId();

  if (!userId) {
    const localAppIds = getLocalAppIds().filter((id) => id != appId);
    setLocalAppIds(localAppIds);
  }

  await callNutAPI('delete-app', { appId });
}

async function createApp(): Promise<string> {
  const { appId } = await callNutAPI('create-app', {});
  if (!appId) {
    const localAppIds = getLocalAppIds();
    localAppIds.push(appId);
    setLocalAppIds(localAppIds);
  }
  return appId;
}

async function getAppTitle(appId: string): Promise<string> {
  const { entries } = await callNutAPI('get-app-entries', {
    appIds: [appId],
  });
  return entries[0].title;
}

async function updateAppTitle(appId: string, title: string): Promise<void> {
  if (!title.trim()) {
    throw new Error('Title cannot be empty');
  }

  await callNutAPI('set-app-title', { appId, title });
}

async function getAppDeploySettings(appId: string): Promise<DeploySettingsDatabase | undefined> {
  console.log('DatabaseGetAppDeploySettingsStart', appId);

  const { deploySettings } = await callNutAPI('get-app-deploy-settings', { appId });
  return deploySettings;
}

async function setAppDeploySettings(appId: string, deploySettings: DeploySettingsDatabase): Promise<void> {
  await callNutAPI('set-app-deploy-settings', { appId, deploySettings });
}

async function abortAppChats(appId: string): Promise<void> {
  await callNutAPI('abort-app-chats', { appId });
}

async function getInitialMessages(appId: string): Promise<Message[]> {
  const { messages } = await callNutAPI('get-initial-messages', { appId });
  return messages;
}

export const database = {
  getAllAppEntries,
  getAppContents,
  deleteApp,
  createApp,
  getAppTitle,
  updateAppTitle,
  getAppDeploySettings,
  setAppDeploySettings,
  abortAppChats,
  getInitialMessages,
};
