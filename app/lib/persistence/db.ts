import type { Message } from './message';
import { getSupabase } from '~/lib/supabase/client';
import { v4 as uuid } from 'uuid';

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

  console.log('CHAT_DATA', data);
  throw new Error('NYI');
}

export async function setMessages(id: string, title: string, messages: Message[]): Promise<void> {
  const { error } = await getSupabase().from('chats').upsert({
    id,
    messages,
    title,
  });

  if (error) {
    throw error;
  }
}

export async function getMessages(id: string): Promise<ChatContents> {
  const { data, error } = await getSupabase().from('chats').select('*').eq('id', id);

  if (error) {
    throw error;
  }

  console.log('CHAT_DATA', data);
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
  await setMessages(id, title, messages);
  return id;
}

export async function updateChatTitle(id: string, title: string): Promise<void> {
  const chat = await getMessages(id);

  if (!title.trim()) {
    throw new Error('Title cannot be empty');
  }

  await setMessages(id, title, chat.messages);
}
