// All apps are stored in the database. Before logging in or creating an account
// we store the IDs of any apps created in local storage. The first time the user logs in,
// any local apps are associated with the user and then local storage is cleared.

import { getCurrentUserId } from '~/lib/supabase/client';
import { v4 as uuid } from 'uuid';
import { getMessagesRepositoryId, type Message } from './message';
import { assert } from '~/lib/replay/ReplayProtocolClient';
import type { DeploySettingsDatabase } from '~/lib/replay/Deploy';
import { callNutAPI } from '~/lib/replay/NutAPI';

export interface AppSummary {
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

async function getAllAppIds(): Promise<string[]> {
  const userId = await getCurrentUserId();
  const localAppIds = getLocalAppIds();

  if (!userId) {
    return localAppIds;
  }

  if (localAppIds.length) {
    try {
      for (const appId of localAppIds) {
        await setAppOwner(appId, userId);
      }
      setLocalChats(undefined);
    } catch (error) {
      console.error('Error syncing local chats', error);
    }
  }

  const { data, error } = await getSupabase().from('chats').select(CHAT_SUMMARY_COLUMNS).eq('deleted', false);

  if (error) {
    throw error;
  }

  const chats = data.map(databaseRowToChatSummary);
  return chats.filter((chat) => !deletedChats.has(chat.id));
}

async function setAppOwner(appId: string, userId: string): Promise<void> {
  await callNutAPI("set-app-owner", { appId, userId });
}

async function setChatContents(chat: ChatContents) {
  const userId = await getCurrentUserId();

  if (!userId) {
    const localChats = getLocalChats().filter((c) => c.id != chat.id);
    localChats.push({
      ...chat,
      updatedAt: new Date().toISOString(),
    });
    setLocalChats(localChats);
    return;
  }

  const repositoryId = getMessagesRepositoryId(chat.messages);

  const { error } = await getSupabase().from('chats').upsert({
    id: chat.id,
    messages: chat.messages,
    title: chat.title,
    user_id: userId,
    repository_id: repositoryId,
    last_protocol_chat_id: chat.lastProtocolChatId,
    last_protocol_chat_response_id: chat.lastProtocolChatResponseId,
  });

  if (error) {
    throw error;
  }
}

async function getChatPublicData(id: string): Promise<{ repositoryId: string; title: string }> {
  const { data, error } = await getSupabase().rpc('get_chat_public_data', { chat_id: id });

  if (error) {
    throw error;
  }

  if (data.length != 1) {
    throw new Error(`Unknown chat ${id}`);
  }

  return {
    repositoryId: data[0].repository_id,
    title: data[0].title,
  };
}

async function getChatContents(id: string): Promise<ChatContents | undefined> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return getLocalChats().find((c) => c.id == id);
  }

  const { data, error } = await getSupabase().from('chats').select('*').eq('id', id);

  if (error) {
    throw error;
  }

  if (data.length != 1) {
    return undefined;
  }

  return databaseRowToChatContents(data[0]);
}

async function deleteChat(id: string): Promise<void> {
  deletedChats.add(id);

  const userId = await getCurrentUserId();

  if (!userId) {
    const localChats = getLocalChats().filter((c) => c.id != id);
    setLocalChats(localChats);
    return;
  }

  const { error } = await getSupabase().from('chats').update({ deleted: true }).eq('id', id);

  if (error) {
    throw error;
  }
}

async function createChat(title: string, messages: Message[]): Promise<ChatContents> {
  const contents = {
    id: uuid(),
    title,
    messages,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    repositoryId: getMessagesRepositoryId(messages),
    lastProtocolChatId: undefined,
    lastProtocolChatResponseId: undefined,
  };
  await setChatContents(contents);
  return contents;
}
async function updateChatTitle(id: string, title: string): Promise<void> {
  const chat = await getChatContents(id);
  assert(chat, 'Unknown chat');

  if (!title.trim()) {
    throw new Error('Title cannot be empty');
  }

  await setChatContents({ ...chat, title });
}

async function getChatDeploySettings(id: string): Promise<DeploySettingsDatabase | undefined> {
  console.log('DatabaseGetChatDeploySettingsStart', id);

  const { data, error } = await getSupabase().from('chats').select('deploy_settings').eq('id', id);

  console.log('DatabaseGetChatDeploySettingsDone', id, data, error);

  if (error) {
    throw error;
  }

  if (data.length != 1) {
    return undefined;
  }

  return data[0].deploy_settings;
}

async function updateChatDeploySettings(id: string, deploySettings: DeploySettingsDatabase): Promise<void> {
  const { error } = await getSupabase().from('chats').update({ deploy_settings: deploySettings }).eq('id', id);

  if (error) {
    console.error('DatabaseUpdateChatDeploySettingsError', id, deploySettings, error);
  }
}

async function updateChatLastMessage(
  id: string,
  protocolChatId: string | null,
  protocolChatResponseId: string | null,
): Promise<void> {
  const { error } = await getSupabase()
    .from('chats')
    .update({ last_protocol_chat_id: protocolChatId, last_protocol_chat_response_id: protocolChatResponseId })
    .eq('id', id);

  if (error) {
    console.error('DatabaseUpdateChatLastMessageError', id, protocolChatId, protocolChatResponseId, error);
  }
}

export const database = {
  getAllChats,
  setChatContents,
  getChatPublicData,
  getChatContents,
  deleteChat,
  createChat,
  updateChatTitle,
  getChatDeploySettings,
  updateChatDeploySettings,
  updateChatLastMessage,
};
