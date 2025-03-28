import { getSupabase } from '~/lib/supabase/client';
import { v4 as uuid } from 'uuid';
import { getMessagesRepositoryId, type Message } from './message';

export interface ChatContents {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  repositoryId: string | undefined;
  messages: Message[];
}

export async function getAllChats(): Promise<ChatContents[]> {
  const { data, error } = await getSupabase().from('chats').select('*');

  if (error) {
    throw error;
  }

  return data.map((d) => {
    return {
      id: d.id,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      title: d.title,
      messages: d.messages,
      repositoryId: d.repository_id,
    };
  });
}

export async function setChatContents(id: string, title: string, messages: Message[]): Promise<void> {
  const { data: user } = await getSupabase().auth.getUser();
  const userId = user.user?.id;

  if (!userId) {
    throw new Error('Not logged in');
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

export async function getChatContents(id: string): Promise<ChatContents> {
  const { data, error } = await getSupabase().from('chats').select('*').eq('id', id);

  if (error) {
    throw error;
  }

  console.log('CHAT_CONTENTS', data);
  throw new Error('NYI');
}

export async function deleteById(id: string): Promise<void> {
  const { error } = await getSupabase().from('chats').delete().eq('id', id);

  if (error) {
    throw error;
  }
}

export async function createChat(title: string, messages: Message[]): Promise<string> {
  const id = uuid();
  await setChatContents(id, title, messages);
  return id;
}

export async function updateChatTitle(id: string, title: string): Promise<void> {
  const chat = await getChatContents(id);

  if (!title.trim()) {
    throw new Error('Title cannot be empty');
  }

  await setChatContents(id, title, chat.messages);
}
