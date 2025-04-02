// When the user is not logged in, chats are kept in local storage.
// Otherwise, they are kept in the database. The first time the user logs in,
// any local chats are added to the database and then deleted.

import { getSupabase, getCurrentUserId } from '~/lib/supabase/client';
import { v4 as uuid } from 'uuid';
import { getMessagesRepositoryId, type Message } from './message';
import { assert } from '~/lib/replay/ReplayProtocolClient';
import type { DeploySettingsDatabase } from '~/lib/replay/Deploy';

export interface ChatContents {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  repositoryId: string | undefined;
  messages: Message[];
}

function databaseRowToChatContents(d: any): ChatContents {
  return {
    id: d.id,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    title: d.title,
    messages: d.messages,
    repositoryId: d.repository_id,
  };
}

const localStorageKey = 'nut-chats';

function getLocalChats(): ChatContents[] {
  const chatJSON = localStorage.getItem(localStorageKey);
  if (!chatJSON) {
    return [];
  }
  return JSON.parse(chatJSON);
}

function setLocalChats(chats: ChatContents[] | undefined): void {
  if (chats) {
    localStorage.setItem(localStorageKey, JSON.stringify(chats));
  } else {
    localStorage.removeItem(localStorageKey);
  }
}

async function getAllChats(): Promise<ChatContents[]> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return getLocalChats();
  }

  const { data, error } = await getSupabase().from('chats').select('*').eq('deleted', false);

  if (error) {
    throw error;
  }

  return data.map(databaseRowToChatContents);
}

async function syncLocalChats(): Promise<void> {
  const userId = await getCurrentUserId();
  const localChats = getLocalChats();

  if (userId && localChats.length) {
    try {
      for (const chat of localChats) {
        if (chat.title) {
          await setChatContents(chat.id, chat.title, chat.messages);
        }
      }
      setLocalChats(undefined);
    } catch (error) {
      console.error('Error syncing local chats', error);
    }
  }
}

async function setChatContents(id: string, title: string, messages: Message[]): Promise<void> {
  const userId = await getCurrentUserId();

  if (!userId) {
    const localChats = getLocalChats().filter((c) => c.id != id);
    localChats.push({
      id,
      title,
      messages,
      repositoryId: getMessagesRepositoryId(messages),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setLocalChats(localChats);
    return;
  }

  const repositoryId = getMessagesRepositoryId(messages);

  const { error } = await getSupabase().from('chats').upsert({
    id,
    messages,
    title,
    user_id: userId,
    repository_id: repositoryId,
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

async function createChat(title: string, messages: Message[]): Promise<string> {
  const id = uuid();
  await setChatContents(id, title, messages);
  return id;
}

async function updateChatTitle(id: string, title: string): Promise<void> {
  const chat = await getChatContents(id);
  assert(chat, 'Unknown chat');

  if (!title.trim()) {
    throw new Error('Title cannot be empty');
  }

  await setChatContents(id, title, chat.messages);
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

async function updateChatDeploySettings(
  id: string,
  deploySettings: DeploySettingsDatabase,
): Promise<void> {
  const { error } = await getSupabase().from('chats').update({ deploy_settings: deploySettings }).eq('id', id);

  if (error) {
    console.error('DatabaseUpdateChatDeploySettingsError', id, deploySettings, error);
  }
}

async function updateChatLastMessage(id: string, protocolChatId: string, protocolChatResponseId: string): Promise<void> {
  const { error } = await getSupabase().from('chats').update({ last_protocol_chat_id: protocolChatId, last_protocol_chat_response_id: protocolChatResponseId }).eq('id', id);

  if (error) {
    console.error('DatabaseUpdateChatLastMessageError', id, protocolChatId, protocolChatResponseId, error);
  }
}

export const Database = {
  getAllChats,
  syncLocalChats,
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
