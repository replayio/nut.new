import { useLoaderData, useNavigate, useSearchParams } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { atom } from 'nanostores';
import type { Message as BaseMessage } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { logStore } from '~/lib/stores/logs'; // Import logStore
import {
  getMessages,
  getNextId,
  getUrlId,
  openDatabase,
  setMessages,
  duplicateChat,
  createChatFromMessages,
} from './db';
import { loadProblem } from '~/components/chat/LoadProblemButton';
import { createAsyncSuspenseValue } from '~/lib/asyncSuspenseValue';

// Messages in a chat's history. The repository may update in response to changes in the messages.
// Each message which changes the repository state must have a repositoryId.
export interface Message extends BaseMessage {
  // Describes the state of the project after changes in this message were applied.
  repositoryId?: string;
}

export interface ChatState {
  description: string;
  messages: Message[];
}

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
}

const persistenceEnabled = !import.meta.env.VITE_DISABLE_PERSISTENCE;

export const database = persistenceEnabled ? createAsyncSuspenseValue(openDatabase) : undefined;

if (typeof document !== 'undefined') {
  database?.preload();
}

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);

export function useChatHistory() {
  const db = database?.read();
  const navigate = useNavigate();
  const { id: mixedId, problemId } = useLoaderData<{ id?: string; problemId?: string }>() ?? {};
  const [searchParams] = useSearchParams();

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(!mixedId && !problemId);
  const [urlId, setUrlId] = useState<string | undefined>();

  const importChat = async (description: string, messages: Message[]) => {
    if (!db) {
      return;
    }

    try {
      const newId = await createChatFromMessages(db, description, messages);
      window.location.href = `/chat/${newId}`;
      toast.success('Chat imported successfully');
    } catch (error) {
      if (error instanceof Error) {
        toast.error('Failed to import chat: ' + error.message);
      } else {
        toast.error('Failed to import chat');
      }
    }
  };

  useEffect(() => {
    if (!db) {
      setReady(true);

      if (persistenceEnabled) {
        const error = new Error('Chat persistence is unavailable');
        logStore.logError('Chat persistence initialization failed', error);
        toast.error('Chat persistence is unavailable');
      }

      return;
    }

    if (mixedId) {
      getMessages(db, mixedId)
        .then((storedMessages) => {
          if (storedMessages && storedMessages.messages.length > 0) {
            const rewindId = searchParams.get('rewindTo');
            const filteredMessages = rewindId
              ? storedMessages.messages.slice(0, storedMessages.messages.findIndex((m) => m.id === rewindId) + 1)
              : storedMessages.messages;

            setInitialMessages(filteredMessages);
            setUrlId(storedMessages.urlId);
            description.set(storedMessages.description);
            chatId.set(storedMessages.id);
          } else {
            navigate('/', { replace: true });
          }

          setReady(true);
        })
        .catch((error) => {
          logStore.logError('Failed to load chat messages', error);
          toast.error(error.message);
        });
    } else if (problemId) {
      loadProblem(problemId, importChat).then(() => setReady(true));
    }
  }, []);

  return {
    ready,
    initialMessages,
    storeMessageHistory: async (messages: Message[]) => {
      if (!db || messages.length === 0) {
        return;
      }

      if (initialMessages.length === 0 && !chatId.get()) {
        const nextId = await getNextId(db);

        chatId.set(nextId);

        if (!urlId) {
          navigateChat(nextId);
        }
      }

      await setMessages(db, chatId.get() as string, messages, urlId, description.get());
    },
    duplicateCurrentChat: async (listItemId: string) => {
      if (!db || (!mixedId && !listItemId)) {
        return;
      }

      try {
        const newId = await duplicateChat(db, mixedId || listItemId);
        navigate(`/chat/${newId}`);
        toast.success('Chat duplicated successfully');
      } catch (error) {
        toast.error('Failed to duplicate chat');
        console.log(error);
      }
    },
    importChat,
    exportChat: async (id = urlId) => {
      if (!db || !id) {
        return;
      }

      const chat = await getMessages(db, id);
      const chatData = {
        messages: chat.messages,
        description: chat.description,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
}

function navigateChat(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/chat/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/chat/${nextId}`;

  window.history.replaceState({}, '', url);
}

// Get the repositoryId before any changes in the message at the given index.
export function getPreviousRepositoryId(messages: Message[], index: number): string | undefined {
  for (let i = index - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.repositoryId) {
      return message.repositoryId;
    }
  }
  return undefined;
}

// Get the repositoryId after applying some messages.
export function getMessagesRepositoryId(messages: Message[]): string | undefined {
  return getPreviousRepositoryId(messages, messages.length);
}
